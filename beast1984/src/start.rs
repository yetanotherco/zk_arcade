//! ```shell
//!   ╔╗  ╔═╗ ╔═╗ ╔═╗ ╔╦╗
//!   ╠╩╗ ║╣  ╠═╣ ╚═╗  ║
//!   ╚═╝ ╚═╝ ╩ ╩ ╚═╝  ╩
//! ```
//!
//! > BEAST is a homage to the 1984 ASCII game "[BEAST](https://en.wikipedia.org/wiki/Beast_(video_game))"
//! > from Dan Baker, Alan Brown, Mark Hamilton and Derrick Shadel.
//!
//!

use std::env;

use crate::{game, stty};
use dotenv::dotenv;
use game_logic::{ANSI_RESET_FONT, BOARD_HEIGHT, BOARD_WIDTH};

pub fn start() {
    let cli_flags = env::args().skip(1).collect::<Vec<String>>();
    if cli_flags.contains(&String::from("--version"))
        || cli_flags.contains(&String::from("-v"))
        || cli_flags.contains(&String::from("-V"))
    {
        println!("v{}", env!("CARGO_PKG_VERSION"));
        std::process::exit(0);
    }

    if !stty::has_stty() && std::env::var_os("CI").is_none() {
        eprintln!(
            "\x1B[31mERROR:{ANSI_RESET_FONT} This game requires a POSIX compatible terminal with stty support."
        );
        std::process::exit(0);
    }

    if std::env::var_os("CI").is_none() {
        if let Ok((columns, rows)) = stty::terminal_size() {
            let min_width = game::ANSI_FRAME_SIZE + (BOARD_WIDTH * 2) + game::ANSI_FRAME_SIZE;
            let min_height = game::ANSI_HEADER_HEIGHT
                + game::ANSI_FRAME_SIZE
                + BOARD_HEIGHT
                + game::ANSI_FRAME_SIZE
                + game::ANSI_FOOTER_HEIGHT
                + 2; // the extra space at the top and bottom
            if columns < min_width || rows < min_height {
                let width_color = if columns < min_width {
                    "\x1B[31m"
                } else {
                    ANSI_RESET_FONT
                };
                let height_color = if rows < min_height {
                    "\x1B[31m"
                } else {
                    ANSI_RESET_FONT
                };
                eprintln!(
                    "\x1B[31mERROR:{ANSI_RESET_FONT} Terminal size is too small.\nThe size is {width_color}{columns}{ANSI_RESET_FONT} x {height_color}{rows}{ANSI_RESET_FONT} but needs to be at least {min_width} x {min_height}."
                );
                std::process::exit(0);
            }
        } else {
            println!("{:?}", stty::terminal_size());
            eprintln!("\x1B[31mERROR:{ANSI_RESET_FONT} Failed to detect terminal size via stty.");
            std::process::exit(0);
        }
    }

    dotenv().ok();
    let mut game = crate::game::Game::new();
    game.play();
}
