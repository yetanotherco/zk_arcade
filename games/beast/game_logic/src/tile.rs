use std::fmt;

use serde::{Deserialize, Serialize};

/// the board width
pub const BOARD_WIDTH: usize = 50;
/// the board height
pub const BOARD_HEIGHT: usize = 30;
/// where the player starts from
pub const PLAYER_START: Coord = Coord {
    column: 0,
    row: BOARD_HEIGHT - 1,
};
/// ANSI escape sequence for bold
pub const ANSI_BOLD: &str = "\x1B[1m";
/// ANSI escape sequence to reset all styles and colors
pub const ANSI_RESET: &str = "\x1B[0m";
/// ANSI escape sequence to reset font color
pub const ANSI_RESET_FONT: &str = "\x1B[39m";
/// ANSI escape sequence to reset background color
pub const ANSI_RESET_BG: &str = "\x1B[49m";
/// left border with color ANSI escape sequence
pub const ANSI_LEFT_BORDER: &str = "\x1b[33m▌\x1b[39m";
/// right border with color ANSI escape sequence
pub const ANSI_RIGHT_BORDER: &str = "\x1b[33m▐\x1b[39m";
/// the logo
pub const LOGO: [&str; 10] = [
    "\x1b[33m▌\x1b[39m                                                                                                    \x1b[33m▐\x1b[39m",
    "\x1b[33m▌\x1b[39m                                                                                                    \x1b[33m▐\x1b[39m",
    "\x1b[33m▌\x1b[39m                               HHHH    HHHHH    HHH     HHHH   HHHHH                                \x1b[33m▐\x1b[39m",
    "\x1b[33m▌\x1b[39m                               H   H   H       H   H   H         H                                  \x1b[33m▐\x1b[39m",
    "\x1b[33m▌\x1b[39m                               H   H   H       H   H   H         H                                  \x1b[33m▐\x1b[39m",
    "\x1b[33m▌\x1b[39m                               HHHH    HHHH    HHHHH    HHH      H                                  \x1b[33m▐\x1b[39m",
    "\x1b[33m▌\x1b[39m                               H   H   H       H   H       H     H                                  \x1b[33m▐\x1b[39m",
    "\x1b[33m▌\x1b[39m                               H   H   H       H   H       H     H                                  \x1b[33m▐\x1b[39m",
    "\x1b[33m▌\x1b[39m                               HHHH    HHHHH   H   H   HHHH      H                                  \x1b[33m▐\x1b[39m",
    "\x1b[33m▌\x1b[39m                                                                                                    \x1b[33m▐\x1b[39m",
];

/// a data structure to place items on a board
#[derive(
    Debug, Default, Clone, Copy, PartialEq, Eq, Hash, PartialOrd, Ord, Serialize, Deserialize,
)]
pub struct Coord {
    pub column: usize,
    pub row: usize,
}

/// the items that can be found on the baord
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum Tile {
    /// empty space
    Empty,
    /// a block `░░`
    Block,
    /// a immovable block `▓▓`
    StaticBlock,
    /// the player `◀▶`
    Player,
    /// a common beast `├┤`
    CommonBeast,
    /// a super beast `╟╢`
    SuperBeast,
    /// an egg `○○`
    Egg,
    /// an egg hatching `○○` (in a different color)
    EggHatching,
    /// a hatched beast `╬╬`
    HatchedBeast,
}

impl Tile {
    /// get the raw symbol of the tile to be displayed in the terminal
    pub fn raw_symbol(&self) -> &'static str {
        match self {
            Tile::Empty => "  ",
            #[cfg(windows)]
            Tile::Block => "▓▓",
            #[cfg(not(windows))]
            Tile::Block => "░░", // This may not render well on Windows terminals
            Tile::StaticBlock => "▓▓",
            Tile::Player => "◀▶",
            Tile::CommonBeast => "├┤",
            Tile::SuperBeast => "╟╢",
            Tile::Egg => "○○",
            Tile::EggHatching => "○○",
            Tile::HatchedBeast => "╬╬",
        }
    }
}

impl fmt::Display for Tile {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        match self {
            Tile::Empty => write!(f, "{}", self.raw_symbol()),
            Tile::Block => write!(f, "\x1b[32m{}\x1b[39m", self.raw_symbol()),
            Tile::StaticBlock => write!(f, "\x1b[33m{}\x1b[39m", self.raw_symbol()),
            Tile::Player => write!(f, "\x1b[36m{}\x1b[39m", self.raw_symbol()),
            Tile::CommonBeast => write!(f, "\x1b[31m{}\x1b[39m", self.raw_symbol()),
            Tile::SuperBeast => write!(f, "\x1b[31m{}\x1b[39m", self.raw_symbol()),
            Tile::Egg => write!(f, "\x1b[31m{}\x1b[39m", self.raw_symbol()),
            Tile::EggHatching => write!(f, "\x1b[35m{}\x1b[39m", self.raw_symbol()),
            Tile::HatchedBeast => write!(f, "\x1b[31m{}\x1b[39m", self.raw_symbol()),
        }
    }
}

/// the allowed directions an entity can move
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum Dir {
    /// moving up
    Up,
    /// moving right
    Right,
    /// moving down
    Down,
    /// moving left
    Left,
}
