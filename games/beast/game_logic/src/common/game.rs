use std::{fs::File, io::BufReader, time::Duration};

use serde::{Deserialize, Serialize};

use crate::common::levels::{Level, LevelConfig, LevelJson};

#[derive(Serialize, Deserialize, Debug)]
pub struct GameJson {
    pub levels: Vec<LevelJson>,
    pub game_config: String,
    pub from_block: u64,
    pub to_block: u64,
}

#[derive(Clone, Debug)]
pub struct GameLevels {
    levels: Vec<LevelConfig>,
}

const GAME_FILE: &str = game_file();

const fn game_file() -> &'static str {
    #[cfg(feature = "devnet")]
    return "levels/devnet.json";

    #[cfg(feature = "stage")]
    return "levels/stage.json";

    #[cfg(feature = "holesky")]
    return "levels/holesky.json";

    #[cfg(feature = "mainnet")]
    return "levels/mainnet.json";

    ""
}

impl GameLevels {
    pub fn new(block_number: u64) -> GameLevels {
        let file = File::open(GAME_FILE).expect("Cannot open game levels file");
        let reader = BufReader::new(file);
        let games: Vec<GameJson> = serde_json::from_reader(reader).expect("Invalid JSON format");

        for game in games.into_iter() {
            if game.from_block <= block_number && block_number < game.to_block {
                return Self::from_levels_json(&game.levels);
            }
        }

        panic!("No game found to play yet");
    }

    pub fn from_levels_json(levels: &[LevelJson]) -> Self {
        Self {
            levels: levels
                .iter()
                .map(|lvl| LevelConfig {
                    blocks: lvl.blocks.try_into().expect("blocks out of range"),
                    static_blocks: lvl
                        .static_blocks
                        .try_into()
                        .expect("static_blocks out of range"),
                    common_beasts: lvl
                        .common_beasts
                        .try_into()
                        .expect("common_beasts out of range"),
                    super_beasts: lvl
                        .super_beasts
                        .try_into()
                        .expect("super_beasts out of range"),
                    eggs: lvl.eggs.try_into().expect("eggs out of range"),
                    egg_hatching_time: Duration::from_millis(lvl.egg_hatching_time),
                    beast_starting_distance: lvl
                        .beast_starting_distance
                        .try_into()
                        .expect("beast_starting_distance out of range"),
                    time: Duration::from_secs(lvl.time),
                    completion_score: lvl
                        .completion_score
                        .try_into()
                        .expect("completion_score out of range"),
                })
                .collect(),
        }
    }

    pub fn get_levels_in_json(&self) -> Vec<LevelJson> {
        self.levels
            .iter()
            .map(|lvl| LevelJson {
                blocks: lvl.blocks,
                static_blocks: lvl.static_blocks,
                common_beasts: lvl.common_beasts,
                super_beasts: lvl.super_beasts,
                eggs: lvl.eggs,
                egg_hatching_time: lvl.egg_hatching_time.as_secs(),
                beast_starting_distance: lvl.beast_starting_distance,
                time: lvl.time.as_secs(),
                completion_score: lvl.completion_score,
            })
            .collect()
    }

    /// return the level config for a specific level
    pub fn get_config(&self, level: Level) -> LevelConfig {
        match level {
            Level::One => self.levels[0].clone(),
            Level::Two => self.levels[1].clone(),
            Level::Three => self.levels[2].clone(),
            Level::Four => self.levels[3].clone(),
            Level::Five => self.levels[4].clone(),
            Level::Six => self.levels[5].clone(),
            Level::Seven => self.levels[6].clone(),
            Level::Eight => self.levels[7].clone(),
        }
    }
}
