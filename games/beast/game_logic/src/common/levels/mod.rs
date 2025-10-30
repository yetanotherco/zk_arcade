use std::{fmt, time::Duration};

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum Level {
    /// level 1
    One,
    /// level 2
    Two,
    /// level 3
    Three
}

impl Level {
    /// go to the next level
    pub fn next(&self) -> Option<Self> {
        match self {
            Self::One => Some(Self::Two),
            Self::Two => Some(Self::Three),
            Self::Three => None,
        }
    }

    pub fn number(&self) -> u16 {
        match self {
            Self::One => 1,
            Self::Two => 2,
            Self::Three => 3,
        }
    }
}

impl fmt::Display for Level {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        match self {
            Level::One => write!(f, "1"),
            Level::Two => write!(f, "2"),
            Level::Three => write!(f, "3"),
        }
    }
}

/// level configuration
#[derive(Debug, Clone, Copy)]
pub struct LevelConfig {
    /// how many blocks are placed on the board
    pub blocks: u8,
    /// how many static blocks are placed on the board
    pub static_blocks: u8,
    /// how many common beasts are placed on the board
    pub common_beasts: u8,
    /// how many super beasts are placed on the board
    pub super_beasts: u8,
    /// how many eggs are placed on the board
    pub eggs: u8,
    /// how long it takes for an egg to hatch
    pub egg_hatching_time: Duration,
    /// how far away from each other the beasts start
    pub beast_starting_distance: u8,
    /// how long the level lasts
    pub time: Duration,
    /// how many points are awarded for completing the level
    pub completion_score: u16,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct LevelJson {
    pub blocks: u8,
    pub static_blocks: u8,
    pub common_beasts: u8,
    pub super_beasts: u8,
    pub eggs: u8,
    pub egg_hatching_time: u64,
    pub beast_starting_distance: u8,
    pub time: u64,
    pub completion_score: u16,
}
