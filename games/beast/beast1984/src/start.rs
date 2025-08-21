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

use std::{env, io::{self, Write}};

use crate::{game, stty};
use dotenv::dotenv;
use game_logic::{ANSI_RESET_FONT, BOARD_HEIGHT, BOARD_WIDTH};

#[cfg(windows)]
fn try_resize_console(_min_width: usize, _min_height: usize) {
    use winapi::um::{
        wincon::{SetConsoleScreenBufferSize, SetConsoleWindowInfo, GetLargestConsoleWindowSize, GetConsoleWindow, COORD, SMALL_RECT},
        processenv::GetStdHandle,
        winbase::STD_OUTPUT_HANDLE,
        handleapi::INVALID_HANDLE_VALUE,
        winuser::{ShowWindow, SW_MAXIMIZE},
    };
    
    unsafe {
        let console_handle = GetStdHandle(STD_OUTPUT_HANDLE);
        if console_handle == INVALID_HANDLE_VALUE {
            return;
        }
        
        // Always go fullscreen on Windows
        let console_window = GetConsoleWindow();
        if !console_window.is_null() {
            ShowWindow(console_window, SW_MAXIMIZE);
            
            // After maximizing, set buffer and window to maximum size
            let max_size = GetLargestConsoleWindowSize(console_handle);
            let buffer_size = COORD {
                X: max_size.X,
                Y: max_size.Y + 100, // Add extra buffer for scrollback
            };
            SetConsoleScreenBufferSize(console_handle, buffer_size);
            
            let window_rect = SMALL_RECT {
                Left: 0,
                Top: 0,
                Right: max_size.X - 1,
                Bottom: max_size.Y - 1,
            };
            SetConsoleWindowInfo(console_handle, 1, &window_rect);
        }
    }
}

#[cfg(windows)]
fn show_resize_error(columns: usize, rows: usize, min_width: usize, min_height: usize) {
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
        "\x1B[31mERROR:{ANSI_RESET_FONT} Could not resize terminal automatically."
    );
    eprintln!(
        "Current size: {width_color}{columns}{ANSI_RESET_FONT} x {height_color}{rows}{ANSI_RESET_FONT}, Required: {min_width} x {min_height}"
    );
    eprintln!("Please manually resize your Command Prompt window to be larger.");
}

fn pause_and_exit(code: i32) {
    // On Windows, always pause on error so user can see what went wrong
    #[cfg(windows)]
    {
        if code != 0 {
            println!("\nPress Enter to exit...");
            let _ = io::stdin().read_line(&mut String::new());
        }
    }
    
    std::process::exit(code);
}

pub fn start() {
    let cli_flags = env::args().skip(1).collect::<Vec<String>>();
    if cli_flags.contains(&String::from("--version"))
        || cli_flags.contains(&String::from("-v"))
        || cli_flags.contains(&String::from("-V"))
    {
        println!("v{}", env!("CARGO_PKG_VERSION"));
        pause_and_exit(0);
    }

    if !stty::has_stty() && std::env::var_os("CI").is_none() {
        eprintln!(
            "\x1B[31mERROR:{ANSI_RESET_FONT} This game requires a POSIX compatible terminal with stty support."
        );
        pause_and_exit(1);
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
            // Try to resize the console window on Windows
            #[cfg(windows)]
            {
                if columns < min_width || rows < min_height {
                    try_resize_console(min_width, min_height);
                    // Re-check the size after attempted resize
                    if let Ok((new_columns, new_rows)) = stty::terminal_size() {
                        if new_columns >= min_width && new_rows >= min_height {
                            println!("Console resized successfully to {}x{}", new_columns, new_rows);
                        } else {
                            show_resize_error(new_columns, new_rows, min_width, min_height);
                            pause_and_exit(1);
                        }
                    } else {
                        show_resize_error(columns, rows, min_width, min_height);
                        pause_and_exit(1);
                    }
                }
            }
            
            #[cfg(not(windows))]
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
                pause_and_exit(1);
            }
        } else {
            println!("{:?}", stty::terminal_size());
            eprintln!("\x1B[31mERROR:{ANSI_RESET_FONT} Failed to detect terminal size via stty.");
            pause_and_exit(1);
        }
    }

    dotenv().ok();
    
    // Wrap game execution in error handling
    let result = std::panic::catch_unwind(|| {
        let mut game = crate::game::Game::new();
        game.play();
    });
    
    match result {
        Ok(_) => {
            // Game completed normally
        }
        Err(e) => {
            eprintln!("\x1B[31mERROR:{ANSI_RESET_FONT} Game crashed with error:");
            if let Some(s) = e.downcast_ref::<&str>() {
                eprintln!("{}", s);
            } else if let Some(s) = e.downcast_ref::<String>() {
                eprintln!("{}", s);
            } else {
                eprintln!("Unknown panic occurred");
            }
            pause_and_exit(1);
        }
    }
}
