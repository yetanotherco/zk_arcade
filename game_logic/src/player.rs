//! this module contains the player struct which manages the player movements

use serde::{Deserialize, Serialize};

use crate::{
    beasts::{Beast, CommonBeast, Egg, HatchedBeast, SuperBeast},
    board::Board,
    pathing::{get_end_of_block_chain, get_next_coord},
    Coord, Dir, Tile, PLAYER_START,
};

/// actions a player can take
pub enum PlayerAction {
    /// killed a common beast
    KillCommonBeast(Coord),
    /// killed a super beast
    KillSuperBeast(Coord),
    /// killed an egg
    KillEgg(Coord),
    /// killed a hatched beast
    KillHatchedBeast(Coord),
    /// player was killed
    KillPlayer,
    /// no action taken
    None,
}

/// the player struct which manages the player movements, score, statistics and lives
#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct Player {
    pub position: Coord,
    pub lives: u8,
    pub score: u16,
    pub beasts_killed: u16,
    pub blocks_moved: u64,
    pub distance_traveled: u64,
}

impl Player {
    /// instantiate a new player
    pub fn new(position: Coord) -> Self {
        Self {
            position,
            lives: 5,
            score: 0,
            beasts_killed: 0,
            blocks_moved: 0,
            distance_traveled: 0,
        }
    }

    /// to move the player use this method
    pub fn advance(&mut self, board: &mut Board, dir: &Dir) -> PlayerAction {
        if let Some(new_coord) = get_next_coord(&self.position, dir) {
            match board[&new_coord] {
                Tile::Empty => {
                    self.distance_traveled += 1;

                    board[&self.position] = Tile::Empty;
                    board[&new_coord] = Tile::Player;
                    self.position = new_coord;
                    PlayerAction::None
                }
                Tile::Block => {
                    if let Some((end_coord, blocks_moved)) =
                        get_end_of_block_chain(board, &new_coord, dir)
                    {
                        let end_tile = board[&end_coord];
                        match end_tile {
                            Tile::Block => {
                                unreachable!(
									"This can't be a block since our get_end_of_block_chain method only returns when this is not a block"
								);
                            }
                            Tile::CommonBeast
                            | Tile::HatchedBeast
                            | Tile::Egg
                            | Tile::EggHatching => {
                                // can be squished against the frame of the board
                                if get_next_coord(&end_coord, dir).is_none_or(|coord| {
                                    board[&coord] == Tile::Block
                                        || board[&coord] == Tile::StaticBlock
                                }) {
                                    self.blocks_moved += blocks_moved;
                                    self.distance_traveled += 1;
                                    self.beasts_killed += 1;

                                    board[&self.position] = Tile::Empty;
                                    board[&new_coord] = Tile::Player;
                                    self.position = new_coord;
                                    board[&end_coord] = Tile::Block;

                                    match end_tile {
                                        Tile::CommonBeast => {
                                            self.score += CommonBeast::get_score();
                                            PlayerAction::KillCommonBeast(end_coord)
                                        }
                                        Tile::Egg | Tile::EggHatching => {
                                            self.score += Egg::get_score();
                                            PlayerAction::KillEgg(end_coord)
                                        }
                                        Tile::HatchedBeast => {
                                            self.score += HatchedBeast::get_score();
                                            PlayerAction::KillHatchedBeast(end_coord)
                                        }
                                        _ => {
                                            unreachable!(
                                                "No other tiles can be found in this match arm"
                                            )
                                        }
                                    }
                                } else {
                                    // there was nothing useful behind the beasts to squish against
                                    PlayerAction::None
                                }
                            }
                            Tile::SuperBeast => {
                                // can't be squished against the frame of the board
                                if get_next_coord(&end_coord, dir)
                                    .is_some_and(|coord| board[&coord] == Tile::StaticBlock)
                                {
                                    self.blocks_moved += blocks_moved;
                                    self.distance_traveled += 1;
                                    self.beasts_killed += 1;

                                    board[&self.position] = Tile::Empty;
                                    board[&new_coord] = Tile::Player;
                                    self.position = new_coord;
                                    board[&end_coord] = Tile::Block;
                                    self.score += SuperBeast::get_score();

                                    PlayerAction::KillSuperBeast(end_coord)
                                } else {
                                    // there was no static block behind the super beasts to squish against
                                    PlayerAction::None
                                }
                            }
                            Tile::StaticBlock | Tile::Player => {
                                // nothing happens on this move since the user is trying to push a stack of blocks against a StaticBlock | Player
                                PlayerAction::None
                            }
                            Tile::Empty => {
                                self.blocks_moved += blocks_moved;
                                self.distance_traveled += 1;

                                board[&self.position] = Tile::Empty;
                                board[&new_coord] = Tile::Player;
                                self.position = new_coord;
                                board[&end_coord] = Tile::Block;

                                PlayerAction::None
                            }
                        }
                    } else {
                        PlayerAction::None
                    }
                }
                Tile::CommonBeast | Tile::SuperBeast | Tile::HatchedBeast => {
                    self.lives -= 1;
                    PlayerAction::KillPlayer
                }
                Tile::Egg | Tile::EggHatching | Tile::StaticBlock | Tile::Player => {
                    /* nothing happens */
                    PlayerAction::None
                }
            }
        } else {
            PlayerAction::None
        }
    }

    /// use this method to respawn the player
    pub fn respawn(&mut self, board: &mut Board) {
        let old_coord = self.position;
        let new_coord = PLAYER_START;
        board[&new_coord] = Tile::Player;
        if board[&old_coord] == Tile::Player {
            board[&old_coord] = Tile::Empty;
        }
        self.position = new_coord;
    }
}
