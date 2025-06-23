//! this module contains the board logic including terrain generation and rendering the board
use std::ops::{Index, IndexMut};

use rand::{seq::SliceRandom, Rng};
use std::{
    fmt::Write,
    time::{Duration, Instant},
};

use crate::{
    beasts::{Beast, CommonBeast, Egg, HatchedBeast, SuperBeast},
    common::levels::Level,
    player::Player,
    Coord, Tile, ANSI_LEFT_BORDER, ANSI_RESET_BG, ANSI_RIGHT_BORDER, BOARD_HEIGHT, BOARD_WIDTH,
    PLAYER_START,
};

/// the board contains our internal representation of what we render on screen
#[derive(Debug, Clone, Copy)]
pub struct Board {
    pub buffer: [[Tile; BOARD_WIDTH]; BOARD_HEIGHT],
}

impl Index<&Coord> for Board {
    type Output = Tile;

    fn index(&self, coord: &Coord) -> &Self::Output {
        &self.buffer[coord.row][coord.column]
    }
}

impl IndexMut<&Coord> for Board {
    fn index_mut(&mut self, coord: &Coord) -> &mut Self::Output {
        &mut self.buffer[coord.row][coord.column]
    }
}

/// data that is returned from the terrain generation to be used by the game struct
#[derive(Clone)]
pub struct BoardTerrainInfo {
    /// the board itself
    pub buffer: [[Tile; BOARD_WIDTH]; BOARD_HEIGHT],
    /// a collection of common beasts with their position on the board
    pub common_beasts: Vec<CommonBeast>,
    /// a collection of super beasts with their position on the board
    pub super_beasts: Vec<SuperBeast>,
    /// a collection of eggs with their position on the board
    pub eggs: Vec<Egg>,
    /// a collection of hatched beasts with their position on the board
    pub hatched_beasts: Vec<HatchedBeast>,
    /// the instance player which includes their position on the board
    pub player: Player,
}

impl Board {
    /// create a new instance of board
    pub fn new(buffer: [[Tile; BOARD_WIDTH]; BOARD_HEIGHT]) -> Self {
        Self { buffer }
    }

    /// Returns a vectorized form of the board buffer
    /// This is required for serialization the input for the zkvm program
    pub fn to_vec(&self) -> Vec<Vec<Tile>> {
        let mut board = vec![vec![Tile::Empty; BOARD_WIDTH]; BOARD_HEIGHT];

        for i in 0..BOARD_HEIGHT {
            for e in 0..BOARD_WIDTH {
                board[i][e] = self.buffer[i][e];
            }
        }

        board
    }

    pub fn new_from_matrix(map: &Vec<Vec<Tile>>) -> Self {
        let mut buffer = [[Tile::Empty; BOARD_WIDTH]; BOARD_HEIGHT];

        let height = std::cmp::min(buffer.len(), BOARD_HEIGHT);
        for i in 0..height {
            let width = std::cmp::min(buffer[i].len(), BOARD_WIDTH);

            for e in 0..width {
                buffer[i][e] = map[i][e];
            }
        }

        Self { buffer }
    }

    /// generate the terrain of the board according to the level config we pass in
    pub fn generate_terrain(level: Level) -> BoardTerrainInfo {
        let mut buffer = [[Tile::Empty; BOARD_WIDTH]; BOARD_HEIGHT];

        let level_config = level.get_config();

        let mut common_beasts = Vec::with_capacity(level_config.common_beasts);
        let mut super_beasts = Vec::with_capacity(level_config.super_beasts);
        let mut eggs = Vec::with_capacity(level_config.eggs);

        buffer[PLAYER_START.row][PLAYER_START.column] = Tile::Player;

        let mut all_positions = (0..BOARD_HEIGHT)
            .flat_map(|row| (0..BOARD_WIDTH).map(move |column| Coord { column, row }))
            .filter(|coord| !(coord.row == BOARD_HEIGHT - 1 && coord.column == 0)) // filter out player position
            .collect::<Vec<Coord>>();

        let total_entities = level_config.blocks
            + level_config.static_blocks
            + level_config.super_beasts
            + level_config.eggs;
        let mut rng = rand::rng();
        all_positions.shuffle(&mut rng);
        let block_positions = all_positions
            .drain(0..total_entities)
            .collect::<Vec<Coord>>();

        for &coord in block_positions.iter().take(level_config.blocks) {
            buffer[coord.row][coord.column] = Tile::Block;
        }

        for &coord in block_positions
            .iter()
            .skip(level_config.blocks)
            .take(level_config.static_blocks)
        {
            buffer[coord.row][coord.column] = Tile::StaticBlock;
        }

        let top_right = Coord {
            column: BOARD_WIDTH - 1,
            row: 0,
        };
        all_positions.sort_by(|coord1, coord2| {
            let distance_row1 = coord1.row as isize - top_right.row as isize;
            let distance_column1 = coord1.column as isize - top_right.column as isize;
            let distance_row2 = coord2.row as isize - top_right.row as isize;
            let distance_column2 = coord2.column as isize - top_right.column as isize;
            // calculating the Euclidean distance
            // distance^2 = distance_x^2+distance_y^2
            let distance1 = distance_row1 * distance_row1 + distance_column1 * distance_column1;
            let distance2 = distance_row2 * distance_row2 + distance_column2 * distance_column2;
            distance1.cmp(&distance2)
        });

        let mut placed_beasts = 0;
        let mut placed_super_beasts = 0;
        let mut placed_eggs = 0;
        let mut i = 0;
        while placed_beasts + placed_super_beasts + placed_eggs
            < level_config.common_beasts + level_config.super_beasts + level_config.eggs
        {
            if i >= all_positions.len() {
                panic!("Could not find a free spot to place all beasts");
            }

            let coord = all_positions[i];
            if placed_super_beasts < level_config.super_beasts {
                super_beasts.push(SuperBeast::new(coord));
                buffer[coord.row][coord.column] = Tile::SuperBeast;
                placed_super_beasts += 1;
            } else if placed_eggs < level_config.eggs {
                let mut rng = rand::rng();
                let time = Instant::now() - Duration::from_millis(rng.random_range(0..3000));
                eggs.push(Egg::new(coord, time));
                buffer[coord.row][coord.column] = Tile::Egg;
                placed_eggs += 1;
            } else if placed_beasts < level_config.common_beasts {
                common_beasts.push(CommonBeast::new(coord));
                buffer[coord.row][coord.column] = Tile::CommonBeast;
                placed_beasts += 1;
            }

            // skipping a couple tiles to give beasts some room
            i += level_config.beast_starting_distance;
        }

        BoardTerrainInfo {
            buffer,
            common_beasts,
            super_beasts,
            eggs,
            hatched_beasts: Vec::new(),
            player: Player::new(PLAYER_START),
        }
    }

    /// render the board to the screen
    pub fn render(&self) -> String {
        let mut output = String::with_capacity(BOARD_WIDTH * BOARD_HEIGHT * 2 + BOARD_HEIGHT);

        for row in self.buffer.iter() {
            write!(output, "{ANSI_LEFT_BORDER}")
                .unwrap_or_else(|_| panic!("Can't write to string buffer"));
            for tile in row.iter() {
                write!(output, "{tile}").unwrap_or_else(|_| panic!("Can't write to string buffer"));
            }
            writeln!(output, "{ANSI_RIGHT_BORDER}")
                .unwrap_or_else(|_| panic!("Can't write to string buffer"));
        }
        write!(output, "{ANSI_RESET_BG}")
            .unwrap_or_else(|_| panic!("Can't write to string buffer"));

        output
    }
}
