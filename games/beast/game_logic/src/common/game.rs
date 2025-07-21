use crate::common::levels::{
    one::{self},
    Level, LevelConfig,
};

// TODO: define more games
#[derive(Clone, Debug)]
pub enum GameMatch {
    One { from_block: u64, to_block: u64 },
}

const GAMES: [GameMatch; 1] = [GameMatch::One {
    from_block: 0,
    to_block: 10000000,
}];

impl GameMatch {
    pub fn new(block_number: u64) -> GameMatch {
        for game in GAMES {
            match game {
                Self::One {
                    from_block,
                    to_block,
                } if (from_block <= block_number && block_number < to_block) => {
                    return Self::One {
                        from_block,
                        to_block,
                    }
                }
                _ => continue,
            }
        }
        panic!("No game found to play yet");
    }

    /// return the level config for a specific level
    pub fn get_config(&self, level: Level) -> LevelConfig {
        match self {
            Self::One { .. } => match level {
                Level::One => one::LEVEL_ONE,
                Level::Two => one::LEVEL_TWO,
                Level::Three => one::LEVEL_THREE,
                Level::Four => one::LEVEL_FOUR,
                Level::Five => one::LEVEL_FIVE,
                Level::Six => one::LEVEL_SIX,
                Level::Seven => one::LEVEL_SEVEN,
                Level::Eight => one::LEVEL_EIGHT,
            },
        }
    }
}
