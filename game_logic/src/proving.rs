use crate::{
    beasts::{CommonBeast, HatchedBeast, SuperBeast},
    player::Player,
    Coord, Dir, Tile,
};
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize)]
pub enum GameLogEntry {
    CommonBeastMoved { idx: usize, new_pos: Coord },
    SuperBeastMoved { idx: usize, new_pos: Coord },
    HatchedBeastMoved { idx: usize, new_pos: Coord },
    PlayerMoved { dir: Dir },
}

#[derive(Serialize, Deserialize)]
pub struct ProgramInput {
    pub board_width: u16,
    pub board_height: u16,
    pub board: Vec<Vec<Tile>>,
    pub common_beasts: Vec<CommonBeast>,
    /// a collection of super beasts with their position on the board
    pub super_beasts: Vec<SuperBeast>,
    /// a collection of eggs with their position on the board
    // TODO ADD EGGS, (deserialization and serialization fails because of Instant type)
    // pub eggs: Vec<Egg>,
    /// a collection of hatched beasts with their position on the board
    pub hatched_beasts: Vec<HatchedBeast>,
    /// the instance player which includes their position on the board
    pub player: Player,
    pub game_log: Vec<GameLogEntry>,
}

#[derive(Serialize, Deserialize)]
pub struct ProgramOutput {
    pub score: u16,
}
