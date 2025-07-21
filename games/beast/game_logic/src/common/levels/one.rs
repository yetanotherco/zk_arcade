//! this module contains the level configuration

use std::time::Duration;

use crate::common::levels::LevelConfig;

/// level config for level 1
pub const LEVEL_ONE: LevelConfig = LevelConfig {
    blocks: 255,
    static_blocks: 10,
    common_beasts: 3,
    super_beasts: 0,
    eggs: 0,
    egg_hatching_time: Duration::from_millis(20000),
    beast_starting_distance: 16,
    time: Duration::from_secs(120),
    completion_score: 5,
};

/// level config for level 2
pub const LEVEL_TWO: LevelConfig = LevelConfig {
    blocks: 250,
    static_blocks: 12,
    common_beasts: 5,
    super_beasts: 0,
    eggs: 0,
    egg_hatching_time: Duration::from_millis(20000),
    beast_starting_distance: 42,
    time: Duration::from_secs(120),
    completion_score: 7,
};

/// level config for level 3
pub const LEVEL_THREE: LevelConfig = LevelConfig {
    blocks: 200,
    static_blocks: 20,
    common_beasts: 12,
    super_beasts: 0,
    eggs: 0,
    egg_hatching_time: Duration::from_millis(20000),
    beast_starting_distance: 27,
    time: Duration::from_secs(240),
    completion_score: 7,
};

/// level config for level 4
pub const LEVEL_FOUR: LevelConfig = LevelConfig {
    blocks: 180,
    static_blocks: 30,
    common_beasts: 10,
    super_beasts: 1,
    eggs: 0,
    egg_hatching_time: Duration::from_millis(20000),
    beast_starting_distance: 27,
    time: Duration::from_secs(240),
    completion_score: 10,
};

/// level config for level 5
pub const LEVEL_FIVE: LevelConfig = LevelConfig {
    blocks: 170,
    static_blocks: 30,
    common_beasts: 10,
    super_beasts: 3,
    eggs: 0,
    egg_hatching_time: Duration::from_millis(20000),
    beast_starting_distance: 27,
    time: Duration::from_secs(240),
    completion_score: 12,
};

/// level config for level 6
pub const LEVEL_SIX: LevelConfig = LevelConfig {
    blocks: 160,
    static_blocks: 30,
    common_beasts: 10,
    super_beasts: 7,
    eggs: 0,
    egg_hatching_time: Duration::from_millis(20000),
    beast_starting_distance: 27,
    time: Duration::from_secs(300),
    completion_score: 15,
};

/// level config for level 7
pub const LEVEL_SEVEN: LevelConfig = LevelConfig {
    blocks: 160,
    static_blocks: 50,
    common_beasts: 5,
    super_beasts: 1,
    eggs: 0,
    egg_hatching_time: Duration::from_millis(20000),
    beast_starting_distance: 27,
    time: Duration::from_secs(300),
    completion_score: 20,
};

/// level config for level 8
pub const LEVEL_EIGHT: LevelConfig = LevelConfig {
    blocks: 160,
    static_blocks: 100,
    common_beasts: 12,
    super_beasts: 8,
    eggs: 0,
    egg_hatching_time: Duration::from_millis(20000),
    beast_starting_distance: 27,
    time: Duration::from_secs(330),
    completion_score: 25,
};
