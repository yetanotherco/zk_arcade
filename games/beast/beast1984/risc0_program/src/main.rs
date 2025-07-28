#![no_main]

use game_logic::{
    beasts::{Beast, BeastAction, CommonBeast, HatchedBeast, SuperBeast},
    board::Board,
    player::{Player, PlayerAction},
    proving::{GameLogEntry, LevelLog, ProgramInput},
    Coord, Tile,
};
use risc0_zkvm::guest::env;

risc0_zkvm::guest::entry!(main);

fn prove_level_completed(input: &LevelLog) -> bool {
    let mut board = Board::new_from_matrix(&input.board);

    /*
     * We need to make sure the given initial conditions match against the level configuration:
     *
     * 1. Count the tile types + push enemies
     * 2. Verify they match with the config
     * 3. Verify the distance between the player and the enemies match
     */
    let level_config = input.level.get_config();
    let mut player: Option<Player> = None;
    let mut common_beasts: Vec<CommonBeast> = vec![];
    let mut super_beasts: Vec<SuperBeast> = vec![];
    let mut hatched_beasts: Vec<HatchedBeast> = vec![];
    // let mut eggs: Vec<Egg> = vec![];
    let mut blocks_tiles_count: usize = 0;
    let mut static_blocks_tiles_count: usize = 0;

    for (i, row) in board.buffer.iter().enumerate() {
        for (e, tile) in row.iter().enumerate() {
            let coord = Coord { row: i, column: e };

            match tile {
                Tile::Block => {
                    blocks_tiles_count += 1;
                }
                Tile::StaticBlock => {
                    static_blocks_tiles_count += 1;
                }
                Tile::CommonBeast => {
                    common_beasts.push(CommonBeast::new(coord));
                }
                Tile::SuperBeast => {
                    super_beasts.push(SuperBeast::new(coord));
                }
                Tile::Egg => {
                    // eggs.push(Egg::new(coord));
                }
                Tile::Player => {
                    if player.is_none() {
                        player = Some(Player::new(coord));
                    } else {
                        panic!("There can only one player tile");
                    }
                }
                _ => {}
            };
        }
    }
    let mut player = player.expect("A player to be in the board");

    assert!(common_beasts.len() == level_config.common_beasts);
    assert!(super_beasts.len() == level_config.super_beasts);
    assert!(blocks_tiles_count == level_config.blocks);
    assert!(static_blocks_tiles_count == level_config.static_blocks);
    assert!(super_beasts.len() == level_config.super_beasts);

    for log in &input.game_log {
        match log {
            GameLogEntry::PlayerMoved { dir } => {
                let player_action = player.advance(&mut board, &dir);

                match player_action {
                    PlayerAction::KillCommonBeast(coord) => {
                        if let Some(idx) = common_beasts
                            .iter()
                            .position(|beast| beast.position == coord)
                        {
                            common_beasts.swap_remove(idx);
                        }
                    }
                    PlayerAction::KillSuperBeast(coord) => {
                        if let Some(idx) = super_beasts
                            .iter()
                            .position(|beast| beast.position == coord)
                        {
                            super_beasts.swap_remove(idx);
                        }
                    }
                    PlayerAction::KillEgg(_coord) => {
                        // if let Some(idx) = self.eggs.iter().position(|egg| egg.position == coord) {
                        //     self.eggs.swap_remove(idx);
                        // }
                    }
                    PlayerAction::KillHatchedBeast(coord) => {
                        if let Some(idx) = hatched_beasts
                            .iter()
                            .position(|beast| beast.position == coord)
                        {
                            hatched_beasts.swap_remove(idx);
                        }
                    }
                    PlayerAction::KillPlayer => {}
                    PlayerAction::None => {}
                }
            }
            GameLogEntry::CommonBeastMoved { old_pos, new_pos } => {
                let beast_action = common_beasts
                    .iter_mut().find(|beast| beast.position == *old_pos)
                    .unwrap()
                    .advance_to(&mut board, player.position, *new_pos)
                    .unwrap();

                if beast_action == BeastAction::PlayerKilled {
                    player.lives -= 1;
                    player.respawn(&mut board);
                }
            }
            GameLogEntry::SuperBeastMoved { old_pos, new_pos } => {
                let beast_action = super_beasts
                    .iter_mut().find(|beast| beast.position == *old_pos)
                    .unwrap()
                    .advance_to(&mut board, player.position, *new_pos)
                    .unwrap();

                if beast_action == BeastAction::PlayerKilled {
                    player.lives -= 1;
                    player.respawn(&mut board);
                }
            }
            GameLogEntry::HatchedBeastMoved { idx, new_pos } => {
                let beast_action = hatched_beasts
                    .get_mut(*idx)
                    .unwrap()
                    .advance_to(&mut board, player.position, *new_pos)
                    .unwrap();

                if beast_action == BeastAction::PlayerKilled {
                    player.lives -= 1;
                    player.respawn(&mut board);
                }
            }
        }
    }

    common_beasts.len() + super_beasts.len() + hatched_beasts.len() == 0 && player.lives > 0
}

fn main() {
    let input = env::read::<ProgramInput>();

    let mut current_level_number: u16 = 0;
    for level_completion in input.levels_log {
        current_level_number += 1;
        if current_level_number != level_completion.level.number() {
            panic!("Level completion must be in order")
        };
        if !prove_level_completed(&level_completion) {
            panic!("Level {} proving failed", level_completion.level.number());
        }
    }

    // Committing in 32 bytes (u256) so its easier to decode in solidity
    let mut number: [u8; 32] = [0; 32];
    let bytes = current_level_number.to_be_bytes();
    number[32 - bytes.len()..].copy_from_slice(&bytes);
    let mut address: [u8; 32] = [0; 32];
    address[12.. 32].copy_from_slice(&input.address);

    env::commit_slice(&number);
    env::commit_slice(&address);
}
