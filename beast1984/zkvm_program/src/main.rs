#![no_main]

use game_logic::{
    beasts::{Beast, BeastAction},
    board::Board,
    player::PlayerAction,
    proving::{GameLogEntry, ProgramInput, ProgramOutput},
};
use risc0_zkvm::guest::env;

risc0_zkvm::guest::entry!(main);

fn main() {
    let mut game_state = env::read::<ProgramInput>();

    let mut board = Board::new_from_matrix(game_state.board);

    // TODO:
    // check: level rules
    // remove time running out
    // check the new position to move for the beast is valid
    for log in game_state.game_log {
        match log {
            GameLogEntry::PlayerMoved { dir } => {
                let player_action = game_state.player.advance(&mut board, &dir);

                match player_action {
                    PlayerAction::KillCommonBeast(coord) => {
                        if let Some(idx) = game_state
                            .common_beasts
                            .iter()
                            .position(|beast| beast.position == coord)
                        {
                            game_state.common_beasts.swap_remove(idx);
                        }
                    }
                    PlayerAction::KillSuperBeast(coord) => {
                        if let Some(idx) = game_state
                            .super_beasts
                            .iter()
                            .position(|beast| beast.position == coord)
                        {
                            game_state.super_beasts.swap_remove(idx);
                        }
                    }
                    PlayerAction::KillEgg(_coord) => {
                        // if let Some(idx) = self.eggs.iter().position(|egg| egg.position == coord) {
                        //     self.eggs.swap_remove(idx);
                        // }
                    }
                    PlayerAction::KillHatchedBeast(coord) => {
                        if let Some(idx) = game_state
                            .hatched_beasts
                            .iter()
                            .position(|beast| beast.position == coord)
                        {
                            game_state.hatched_beasts.swap_remove(idx);
                        }
                    }
                    PlayerAction::KillPlayer => {}
                    PlayerAction::None => {}
                }
            }
            GameLogEntry::CommonBeastMoved { idx, new_pos } => {
                let beast_action = game_state.common_beasts.get_mut(idx).unwrap().advance_to(
                    &mut board,
                    game_state.player.position,
                    new_pos,
                );

                if beast_action == BeastAction::PlayerKilled {
                    game_state.player.lives -= 1;
                    game_state.player.respawn(&mut board);
                }
            }
            GameLogEntry::SuperBeastMoved { idx, new_pos } => {
                let beast_action = game_state.super_beasts.get_mut(idx).unwrap().advance_to(
                    &mut board,
                    game_state.player.position,
                    new_pos,
                );

                if beast_action == BeastAction::PlayerKilled {
                    game_state.player.lives -= 1;
                    game_state.player.respawn(&mut board);
                }
            }
            GameLogEntry::HatchedBeastMoved { idx, new_pos } => {
                let beast_action = game_state.hatched_beasts.get_mut(idx).unwrap().advance_to(
                    &mut board,
                    game_state.player.position,
                    new_pos,
                );

                if beast_action == BeastAction::PlayerKilled {
                    game_state.player.lives -= 1;
                    game_state.player.respawn(&mut board);
                }
            }
        }
    }

    // CHECK USER HAS ENOUGH LIVES AND HAS KILLED ALL ENEMIES
    if game_state.common_beasts.len()
        + game_state.super_beasts.len()
        + game_state.hatched_beasts.len()
        == 0
        && game_state.player.lives > 0
    {
        // TODO Consider a better way of giving points
        // use level points from config
        let output = ProgramOutput { score: 1000 };
        env::commit(&output);
    } else {
        panic!(
            "Invalid solution {} {}",
            game_state.common_beasts.len(),
            game_state.player.lives
        );
    }
}
