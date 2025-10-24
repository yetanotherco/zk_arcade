use std::{fs::File, io::Write};

use game_logic::common::{game::GameJson, levels::LevelJson};
use primitive_types::U256;
use rand::Rng;
use serde::{Deserialize, Serialize};

fn base_template() -> Vec<LevelJson> {
    vec![
        LevelJson {
            blocks: 200,
            static_blocks: 10,
            common_beasts: 5,
            super_beasts: 0,
            eggs: 0,
            egg_hatching_time: 20000,
            beast_starting_distance: 16,
            time: 150,
            completion_score: 5,
        },
        LevelJson {
            blocks: 175,
            static_blocks: 30,
            common_beasts: 8,
            super_beasts: 2,
            eggs: 0,
            egg_hatching_time: 20000,
            beast_starting_distance: 42,
            time: 150,
            completion_score: 7,
        },
        LevelJson {
            blocks: 150,
            static_blocks: 50,
            common_beasts: 8,
            super_beasts: 5,
            eggs: 0,
            egg_hatching_time: 20000,
            beast_starting_distance: 27,
            time: 300,
            completion_score: 7,
        },
    ]
}

fn extrapolate_level(prev: &LevelJson, level_index: usize, rng: &mut impl Rng) -> LevelJson {
    let factor = 1.0 + (level_index as f32 * 0.05); // progressive difficulty increase
    let variation = |base: u8, max_variation: u8| -> u8 {
        let mut rng = rand::rng();
        let var = rng.random_range(0..=max_variation);
        base.saturating_add(var)
    };

    LevelJson {
        blocks: (prev.blocks as f32 * 0.98) as u8 - rng.random_range(0..3),
        static_blocks: variation(prev.static_blocks, 5),
        common_beasts: variation(prev.common_beasts, 3),
        super_beasts: prev.super_beasts + rng.random_range(0..=2),
        eggs: 0,
        egg_hatching_time: prev.egg_hatching_time,
        beast_starting_distance: variation(prev.beast_starting_distance, 5),
        time: (prev.time as f32 * factor.min(1.5)) as u64,
        completion_score: prev.completion_score + 3 + rng.random_range(0..=3),
    }
}

fn encode_game_config(game_levels: &[LevelJson]) -> [u8; 32] {
    let mut levels: [[u8; 4]; 3] = [[0u8; 4]; 3];

    for i in 0..game_levels.len() {
        let level = &game_levels[i];
        levels[i][0] = level.blocks;
        levels[i][1] = level.static_blocks;
        levels[i][2] = level.common_beasts;
        levels[i][3] = level.super_beasts;
    }

    let mut packed_game = [0u8; 32];
    for (i, level) in levels.iter().enumerate() {
        packed_game[i * 4] = level[0];
        packed_game[i * 4 + 1] = level[1];
        packed_game[i * 4 + 2] = level[2];
        packed_game[i * 4 + 3] = level[3];
    }

    packed_game
}

fn generate_game_levels(levels_per_game: usize, rng: &mut impl Rng) -> Vec<LevelJson> {
    let base = base_template();
    let mut levels = vec![];

    for i in 0..levels_per_game {
        if i < base.len() {
            let mut level: LevelJson = base[i].clone();

            // Add per-game randomness (~5%)
            let mut fuzz = |v: u8| {
                v.saturating_add(rng.random_range(-(v as i16 / 20)..=(v as i16 / 20)).max(0) as u8)
            };
            level.blocks = fuzz(level.blocks);
            level.static_blocks = fuzz(level.static_blocks);
            level.common_beasts = fuzz(level.common_beasts);
            level.super_beasts = fuzz(level.super_beasts);
            level.completion_score = level.completion_score;
            levels.push(level);
        } else {
            let prev = levels.last().unwrap();
            levels.push(extrapolate_level(prev, i, rng));
        }
    }

    levels
}

#[derive(Serialize, Deserialize)]
#[allow(non_snake_case)]
struct LeaderboardLevel {
    endsAtTime: String,
    gameConfig: String,
    startsAtTime: String,
}

#[derive(Serialize, Deserialize)]
struct LeaderboardConfig {
    games: Vec<LeaderboardLevel>,
}

fn main() {
    let args: Vec<String> = std::env::args().collect();
    if args.len() != 6 {
        eprintln!(
            "Usage: {} <number_of_games> <levels_per_game> <total_campaign_in_days> <submission_offset_in_minutes> <network>",
            args[0]
        );
        std::process::exit(1);
    }

    let num_games: usize = args[1].parse().expect("Invalid number of games");
    let levels_per_game: usize = args[2].parse().expect("Invalid number of levels");
    let time_days: u64 = args[3].parse().expect("Invalid total campaign in days");
    let submission_offset_minutes: u64 = args[4].parse().expect("Invalid submission offset minutes");
    let network: String = args[5].parse().expect("Invalid network");

    // Get the current time in seconds from the OS
    let current_time = std::time::SystemTime::now();
    let mut current_timestamp = current_time
        .duration_since(std::time::UNIX_EPOCH)
        .expect("Time went backwards")
        .as_secs();

    let time_in_seconds = time_days * 24 * 3600;
    let seconds_per_game = time_in_seconds / num_games as u64;

    let mut rng = rand::rng();
    let games: Vec<GameJson> = (0..num_games)
        .map(|_| {
            let levels = generate_game_levels(levels_per_game, &mut rng);
            let from_time = current_timestamp;
            let to_time = current_timestamp + seconds_per_game;
            current_timestamp = to_time;

            GameJson {
                from_time: from_time,
                to_time: to_time + submission_offset_minutes * 60,
                game_config: hex::encode(encode_game_config(&levels)),
                levels,
            }
        })
        .collect();

    let json = serde_json::to_string_pretty(&games).expect("Failed to serialize");

    let mut file = File::create(format!("levels/{}.json", network)).expect("Unable to create file");
    file.write_all(json.as_bytes())
        .expect("Unable to write to file");
    println!("Levels written to levels/{}.json", network);

    let mut leaderboard_file = File::create(format!("levels/leaderboard_{}.json", network))
        .expect("Unable to create file");
    let leaderboard_config = LeaderboardConfig {
        games: games
            .iter()
            .map(|game| {
                let mut start_buf = [0u8; 32];
                let mut end_buf = [0u8; 32];

                U256::from(game.from_time).to_big_endian(&mut start_buf);
                U256::from(game.to_time).to_big_endian(&mut end_buf);

                LeaderboardLevel {
                    startsAtTime: format!("0x{}", hex::encode(start_buf)),
                    endsAtTime: format!("0x{}", hex::encode(end_buf)),
                    gameConfig: format!("0x{}", game.game_config.clone()),
                }
            })
            .collect(),
    };
    let leaderboard_config_json =
        serde_json::to_string_pretty(&leaderboard_config).expect("Failed to serialize");
    leaderboard_file
        .write_all(leaderboard_config_json.as_bytes())
        .expect("Unable to write to file");
    println!(
        "Leaderboard for contract config written to levels/leaderboard_{}.json",
        network
    );
}
