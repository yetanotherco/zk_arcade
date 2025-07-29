use crate::{
    common::levels::{Level, LevelJson},
    Coord, Dir, Tile,
};
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Clone, Debug)]
pub enum GameLogEntry {
    CommonBeastMoved { old_pos: Coord, new_pos: Coord },
    SuperBeastMoved { old_pos: Coord, new_pos: Coord },
    HatchedBeastMoved { idx: usize, new_pos: Coord },
    PlayerMoved { dir: Dir },
}

#[derive(Clone, Serialize, Deserialize)]
pub struct LevelLog {
    /// The level to prove and check the board against
    pub level: Level,
    /// The initial game board
    pub board: Vec<Vec<Tile>>,
    /// The log of movements through the game so it can be replayed on the zkvm
    pub game_log: Vec<GameLogEntry>,
}

#[derive(Serialize, Deserialize)]
pub struct ProgramInput {
    pub levels: Vec<LevelJson>,
    pub levels_log: Vec<LevelLog>,
    pub address: Vec<u8>,
}
