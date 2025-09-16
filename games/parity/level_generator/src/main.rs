use std::{fs::File, io::Write};

use primitive_types::U256;
use rand::Rng;
use serde::{Deserialize, Serialize};

#[derive(Deserialize, Serialize, Debug)]
#[allow(non_snake_case)]
struct GameEntry {
    endsAtTime: String,
    gameConfig: String,
    startsAtTime: String,
}

#[derive(Deserialize, Serialize, Debug)]
struct Game {
    games: Vec<GameEntry>,
}

#[derive(Deserialize, Serialize, Debug)]
enum Movement {
    Up,
    Down,
    Left,
    Right,
}

#[derive(Deserialize, Serialize, Debug)]
struct ParityLevel {
    number: u8,
    initial_pos_x: u8,
    initial_pos_y: u8,
    board: Vec<u8>,
    solution: Vec<Movement>,
}

fn encode_parity_levels(levels: Vec<ParityLevel>) -> [u8; 32] {
    let mut bytes: [u8; 32] = [0; 32];
    // Because each level takes 10 bytes we use a total of 30 bytes
    // we pad the bytes with two leading zeroes
    // this is to maintain the consistency with the way circom prover commits the public inputs
    let offset_bytes = 2;

    for (i, level) in levels.iter().enumerate() {
        let initial_pos: u8 = (level.initial_pos_x << 4) | (level.initial_pos_y & 0x0F);
        let i = i * 10 + offset_bytes;
        bytes[i] = initial_pos;
        for (j, tile) in level.board.iter().enumerate() {
            bytes[i + j + 1] = *tile;
        }
    }

    bytes
}

fn random_number_between(min: u8, max: u8) -> u8 {
    let mut rng = rand::rng();
    rng.random_range(min.into()..max.into())
}

fn possible(roll: i16, selected: u8) -> bool {
    match roll {
        -1 => false,
        0 if selected / 3 == 0 => false,
        1 if selected / 3 == 2 => false,
        2 if selected % 3 == 0 => false,
        3 if selected % 3 == 2 => false,
        _ => true,
    }
}

// Verify that the board is valid, checking if the difference between the max and min value is not greater
// than the amount of movements.
// Note: This could be improved even more, since the user cannot move all the times to the same board position.
fn is_board_valid(board: &[u8], movements: u8) -> bool {
    let max_val = *board.iter().max().unwrap_or(&0);
    let min_val = *board.iter().min().unwrap_or(&0);

    !(max_val - min_val > movements)
}

fn calculate_movements_for_level(
    level_index: u8,
    total_levels: u8,
    min_movements: u8,
    max_movements: u8,
) -> u8 {
    if total_levels <= 1 {
        return min_movements;
    }

    let movement_range = max_movements - min_movements;

    let randomness: f32 = rand::random_range(0.0..(movement_range as f32 / total_levels as f32));

    let progression_step = movement_range as f32 / (total_levels - 1) as f32;
    let level_movements = min_movements as f32 + (level_index as f32 * progression_step);

    (level_movements + randomness)
        .round()
        .min(max_movements as f32) as u8
}

fn gen_levels(
    num_levels: u8,
    min_end_of_level: u8,
    max_end_of_level: u8,
    min_movements: u8,
    max_movements: u8,
) -> Vec<ParityLevel> {
    let mut levels: Vec<ParityLevel> = vec![];
    for i in 0..num_levels {
        let end = random_number_between(min_end_of_level, max_end_of_level);
        let mut board = vec![];
        for _ in 0..9 {
            board.push(end);
        }

        let mut selected = random_number_between(0, 9);
        let mut solution: Vec<Movement> = vec![];
        board[selected as usize] = board[selected as usize].saturating_sub(1);

        let moves = calculate_movements_for_level(i, num_levels, min_movements, max_movements);

        for j in 0..moves {
            let mut roll = -1;

            while !possible(roll, selected) {
                roll = random_number_between(0, 4) as i16;
            }

            match roll {
                0 => {
                    selected -= 3;
                    solution.push(Movement::Down);
                    if j + 1 != moves {
                        board[selected as usize] = board[selected as usize].saturating_sub(1);
                    }
                }
                1 => {
                    selected += 3;
                    solution.push(Movement::Up);
                    if j + 1 != moves {
                        board[selected as usize] = board[selected as usize].saturating_sub(1);
                    }
                }
                2 => {
                    selected -= 1;
                    solution.push(Movement::Right);
                    if j + 1 != moves {
                        board[selected as usize] = board[selected as usize].saturating_sub(1);
                    }
                }
                3 => {
                    selected += 1;
                    solution.push(Movement::Left);
                    if j + 1 != moves {
                        board[selected as usize] = board[selected as usize].saturating_sub(1);
                    }
                }
                _ => {}
            }
        }

        if is_board_valid(&board, moves) {
            let x = selected % 3;
            let y = selected / 3;

            // Get the solution
            solution.reverse();

            levels.push(ParityLevel {
                number: i + 1,
                board,
                solution,
                initial_pos_x: x,
                initial_pos_y: y,
            });
        }
    }

    levels
}

fn main() {
    let args: Vec<String> = std::env::args().collect();
    if args.len() != 10 {
        eprintln!(
            "Usage: {} <number_of_games> <levels_per_game> <min_end_of_level> <max_end_of_level> <min_movements> <max_movements> <total_campaign_in_days> <submission_offset_in_minutes> <network>",
            args[0]
        );
        std::process::exit(1);
    }

    let num_games: usize = args[1].parse().expect("Invalid number of games");
    let num_levels = args[2].parse().expect("Invalid levels per game");
    let min_end_of_level = args[3].parse().expect("Invalid min end of level");
    let max_end_of_level = args[4].parse().expect("Invalid max end of level");
    let min_movements = args[5].parse().expect("Invalid min movements");
    let max_movements = args[6].parse().expect("Invalid max movements");
    let time_days: u64 = args[7].parse().expect("Invalid total campaign in days");
    let submission_offset_minutes: u64 = args[8].parse().expect("Invalid submission offset");
    let network: String = args[9].parse().expect("Invalid network");

    let current_time = std::time::SystemTime::now();
    let mut current_timestamp = current_time
        .duration_since(std::time::UNIX_EPOCH)
        .expect("Time went backwards")
        .as_secs();

    let time_in_seconds = time_days * 24 * 3600;
    let seconds_per_game = time_in_seconds / num_games as u64;

    let mut games: Vec<GameEntry> = vec![];
    for _ in 0..num_games {
        let game_levels = gen_levels(
            num_levels,
            min_end_of_level,
            max_end_of_level,
            min_movements,
            max_movements,
        );
        let bytes = encode_parity_levels(game_levels);
        let game_config = format!("0x{}", hex::encode(bytes));

        let mut start_at_time_bytes = [0u8; 32];
        let mut ends_at_time_bytes = [0u8; 32];
        U256::from(current_timestamp).to_big_endian(&mut start_at_time_bytes);
        U256::from(current_timestamp + seconds_per_game + submission_offset_minutes * 60)
            .to_big_endian(&mut ends_at_time_bytes);
        current_timestamp = current_timestamp + seconds_per_game;

        games.push(GameEntry {
            startsAtTime: format!("0x{}", hex::encode(&start_at_time_bytes)),
            endsAtTime: format!("0x{}", hex::encode(&ends_at_time_bytes)),
            gameConfig: game_config,
        });
    }

    let game = Game { games };
    let json = serde_json::to_string_pretty(&game).expect("Failed to serialize");

    let mut file =
        File::create(format!("levels/parity_{}.json", network)).expect("Unable to create file");
    file.write_all(json.as_bytes())
        .expect("Unable to write to file");
    println!("Levels written to levels/parity_{}.json", network);
}
