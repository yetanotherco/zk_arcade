//! this module contains the main struct that orchestrates the game

use crate::{
    help::Help,
    prover::{prove, save_proof},
    stty::{RawMode, install_raw_mode_signal_handler},
};
use game_logic::{
    ANSI_BOLD, ANSI_LEFT_BORDER, ANSI_RESET, ANSI_RESET_BG, ANSI_RESET_FONT, ANSI_RIGHT_BORDER,
    BOARD_HEIGHT, BOARD_WIDTH, Dir, LOGO, Tile,
    beasts::{Beast, BeastAction, CommonBeast, Egg, HatchedBeast, HatchingState, SuperBeast},
    board::Board,
    common::levels::Level,
    player::{Player, PlayerAction},
    proving::{GameLogEntry, LevelLog},
};
use std::{
    io::{self, Read},
    sync::mpsc,
    thread::{self, JoinHandle},
    time::{Duration, Instant},
};

/// the height of the board
pub const ANSI_BOARD_HEIGHT: usize = BOARD_HEIGHT;
/// the size of the frame
pub const ANSI_FRAME_SIZE: usize = 1;
/// the height of the header
pub const ANSI_HEADER_HEIGHT: usize = 4;
/// the height of the footer
pub const ANSI_FOOTER_HEIGHT: usize = 2;
/// the time between game ticks
const TICK_DURATION: Duration = Duration::from_millis(200);

/// we need the [Beat] to count down when we call the beast advance methods and for animations
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Beat {
    One,
    Two,
    Three,
    Four,
    Five,
}

impl Beat {
    /// make the beat go in a cycle
    pub fn next(&self) -> Self {
        match self {
            Self::One => Self::Two,
            Self::Two => Self::Three,
            Self::Three => Self::Four,
            Self::Four => Self::Five,
            Self::Five => Self::One,
        }
    }
}

/// the states our game can be in
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum GameState {
    /// at the start we show an intro screen you can't get back to
    Intro,
    /// playing the game
    Playing,
    /// the dying state is to make sure we can keep track of dying animations, it is also a playing state
    Dying(Beat),
    /// the killing state is to make sure we can keep track of dying animations, it is also a playing state
    Killing(Beat),
    /// the level is done and we display a modal to give the player a short pause
    LevelComplete,
    /// displaying the help screen
    Help,
    /// Display the prove execution screen
    ProveExecution,
    /// the game is over and we quit the game entirely
    GameOver,
    /// the game was won
    Won,
    /// the game was lost
    Quit,
}

/// this is our main game struct that orchestrates the game and its bits
pub struct Game {
    /// our board
    pub board: Board,
    /// the current level we're in
    pub level: Level,
    /// when we started the level
    pub level_start: Instant,
    /// all of our common beasts instances
    pub common_beasts: Vec<CommonBeast>,
    /// all of our super beasts instances
    pub super_beasts: Vec<SuperBeast>,
    /// all of our egg instances
    pub eggs: Vec<Egg>,
    /// all of our hatched beasts instances
    pub hatched_beasts: Vec<HatchedBeast>,
    /// the player
    pub player: Player,
    /// the state the game is in
    pub state: GameState,
    /// Store the log for proving the completion of games in the zkvm
    pub levels_completion_log: Vec<LevelLog>,
    pub has_won: bool,
    beat: Beat,
    input_listener: mpsc::Receiver<u8>,
    _raw_mode: RawMode,
}

impl Game {
    /// create a new instance of the beast game
    pub fn new() -> Self {
        let board_terrain_info = Board::generate_terrain(Level::One);

        install_raw_mode_signal_handler();
        let _raw_mode = RawMode::enter().unwrap_or_else(|error| {
            eprintln!("Raw mode could not be entered in this shell: {error}\x1b[?25h",);
            std::process::exit(1);
        });
        let (sender, receiver) = mpsc::channel::<u8>();
        {
            let stdin = io::stdin();
            thread::spawn(move || {
                let mut lock = stdin.lock();
                let mut buffer = [0u8; 1];
                while lock.read_exact(&mut buffer).is_ok() {
                    if sender.send(buffer[0]).is_err() {
                        break;
                    }
                }
            });
        }

        let board = Board::new(board_terrain_info.buffer);

        let fist_level_log = LevelLog {
            level: Level::One,
            board: board.to_vec(),
            game_log: vec![],
        };

        Self {
            levels_completion_log: vec![fist_level_log],
            board: Board::new(board_terrain_info.buffer),
            level: Level::One,
            level_start: Instant::now(),
            common_beasts: board_terrain_info.common_beasts,
            super_beasts: board_terrain_info.super_beasts,
            eggs: board_terrain_info.eggs,
            hatched_beasts: board_terrain_info.hatched_beasts,
            player: board_terrain_info.player,
            state: GameState::Intro,
            beat: Beat::One,
            has_won: false,
            input_listener: receiver,
            _raw_mode,
        }
    }

    pub fn start_new_game(&mut self) {
        let board_terrain_info = Board::generate_terrain(Level::One);
        let board = Board::new(board_terrain_info.buffer);
        let fist_level_log = LevelLog {
            level: Level::One,
            board: board.to_vec(),
            game_log: vec![],
        };

        self.levels_completion_log = vec![fist_level_log];
        self.board = board;
        self.level = Level::One;
        self.level_start = Instant::now();
        self.common_beasts = board_terrain_info.common_beasts;
        self.super_beasts = board_terrain_info.super_beasts;
        self.eggs = board_terrain_info.eggs;
        self.hatched_beasts = board_terrain_info.hatched_beasts;
        self.player = board_terrain_info.player;
        self.player.score = 0;
        self.has_won = false;
        self.beat = Beat::One;
        self.state = GameState::Playing;
    }

    /// play the game
    pub fn play(&mut self) {
        let last_tick = Instant::now();

        loop {
            match self.state {
                GameState::Intro => {
                    self.handle_intro_state();
                }
                GameState::Playing | GameState::Dying(_) | GameState::Killing(_) => {
                    self.handle_playing_state(last_tick);
                }
                GameState::LevelComplete => {
                    self.handle_level_complete();
                }
                GameState::Help => {
                    self.handle_help_state();
                }
                GameState::ProveExecution => {
                    self.handle_prove_execution_state();
                }
                GameState::GameOver => {
                    self.handle_death_state();
                }
                GameState::Won => {
                    self.handle_win_state();
                }
                GameState::Quit => {
                    println!("Bye...");
                    break;
                }
            }
        }
    }

    fn handle_intro_state(&mut self) {
        println!("{}", Self::render_intro());

        loop {
            if let Ok(byte) = self.input_listener.try_recv() {
                match byte as char {
                    ' ' => {
                        self.level_start = Into::into(Instant::now());
                        self.state = GameState::Playing;
                        break;
                    }
                    'h' | 'H' => {
                        self.level_start = Into::into(Instant::now());
                        self.state = GameState::Help;
                        break;
                    }
                    'q' | 'Q' => {
                        self.state = GameState::Quit;
                        break;
                    }
                    _ => {}
                }
            }
        }
    }

    fn handle_playing_state(&mut self, mut last_tick: Instant) {
        print!("{}", self.render_board());

        loop {
            if let Ok(byte) = self.input_listener.try_recv() {
                if byte == 0x1B {
                    let second = self.input_listener.recv().unwrap_or(0);
                    let third = self.input_listener.recv().unwrap_or(0);
                    if second == b'[' {
                        let mut render = false;
                        let player_action = match third {
                            b'A' => {
                                let player_action = self.player.advance(&mut self.board, &Dir::Up);
                                render = true;
                                self.push_to_log(GameLogEntry::PlayerMoved { dir: Dir::Up });
                                player_action
                            }
                            b'C' => {
                                let player_action =
                                    self.player.advance(&mut self.board, &Dir::Right);
                                render = true;
                                self.push_to_log(GameLogEntry::PlayerMoved { dir: Dir::Right });
                                player_action
                            }
                            b'B' => {
                                let player_action =
                                    self.player.advance(&mut self.board, &Dir::Down);
                                render = true;
                                self.push_to_log(GameLogEntry::PlayerMoved { dir: Dir::Down });
                                player_action
                            }
                            b'D' => {
                                let player_action =
                                    self.player.advance(&mut self.board, &Dir::Left);
                                render = true;
                                self.push_to_log(GameLogEntry::PlayerMoved { dir: Dir::Left });
                                player_action
                            }
                            _ => PlayerAction::None,
                        };

                        match player_action {
                            PlayerAction::KillCommonBeast(coord) => {
                                self.state = GameState::Killing(Beat::One);
                                if let Some(idx) = self
                                    .common_beasts
                                    .iter()
                                    .position(|beast| beast.position == coord)
                                {
                                    self.common_beasts.swap_remove(idx);
                                }
                            }
                            PlayerAction::KillSuperBeast(coord) => {
                                self.state = GameState::Killing(Beat::One);
                                if let Some(idx) = self
                                    .super_beasts
                                    .iter()
                                    .position(|beast| beast.position == coord)
                                {
                                    self.super_beasts.swap_remove(idx);
                                }
                            }
                            PlayerAction::KillEgg(coord) => {
                                self.state = GameState::Killing(Beat::One);
                                if let Some(idx) =
                                    self.eggs.iter().position(|egg| egg.position == coord)
                                {
                                    self.eggs.swap_remove(idx);
                                }
                            }
                            PlayerAction::KillHatchedBeast(coord) => {
                                self.state = GameState::Killing(Beat::One);
                                if let Some(idx) = self
                                    .hatched_beasts
                                    .iter()
                                    .position(|beast| beast.position == coord)
                                {
                                    self.hatched_beasts.swap_remove(idx);
                                }
                            }
                            PlayerAction::KillPlayer => {
                                self.state = GameState::Dying(Beat::One);
                            }
                            PlayerAction::None => {}
                        }

                        if render {
                            // the player renders independent from the tick speed of the beasts
                            self.render_with_state();
                        }
                    }
                } else {
                    match byte as char {
                        'q' | 'Q' => {
                            self.state = GameState::Quit;
                            break;
                        }
                        'h' | 'H' => {
                            self.state = GameState::Help;
                            break;
                        }
                        _ => {}
                    }
                }
            }

            // end game through time has ran out or no more lives
            if self.player.lives == 0 || self.get_secs_remaining() == 0 {
                self.state = GameState::GameOver;
                self.render_with_state();
                break;
            }

            // eggs hatching
            self.eggs
                .retain_mut(|egg| match egg.hatch(self.level.get_config()) {
                    HatchingState::Incubating => true,
                    HatchingState::Hatching(position, _instant) => {
                        self.board[&position] = Tile::EggHatching;
                        true
                    }
                    HatchingState::Hatched(position) => {
                        self.hatched_beasts.push(HatchedBeast::new(position));
                        self.board[&position] = Tile::HatchedBeast;
                        false
                    }
                });

            // end game through no more beasts
            if self.common_beasts.len()
                + self.super_beasts.len()
                + self.eggs.len()
                + self.hatched_beasts.len()
                == 0
            {
                let secs_remaining = self.get_secs_remaining();
                self.player.score += secs_remaining as u16 / 10;

                self.state = GameState::LevelComplete;
                break;
            }

            // game tick
            if last_tick.elapsed() >= TICK_DURATION {
                if matches!(self.beat, Beat::Five) {
                    // beast movements
                    for idx in 0..self.common_beasts.len() {
                        let old_pos = self.common_beasts[idx].position;
                        let action =
                            self.common_beasts[idx].advance(&mut self.board, self.player.position);

                        self.push_to_log(GameLogEntry::CommonBeastMoved {
                            old_pos,
                            new_pos: self.common_beasts[idx].position,
                        });

                        if action == BeastAction::PlayerKilled {
                            self.player.lives -= 1;
                            self.player.respawn(&mut self.board);
                            self.state = GameState::Dying(Beat::One);
                        }
                    }
                    for idx in 0..self.super_beasts.len() {
                        let old_pos = self.super_beasts[idx].position;
                        let action =
                            self.super_beasts[idx].advance(&mut self.board, self.player.position);

                        self.push_to_log(GameLogEntry::SuperBeastMoved {
                            old_pos,
                            new_pos: self.super_beasts[idx].position,
                        });

                        if action == BeastAction::PlayerKilled {
                            self.player.lives -= 1;
                            self.player.respawn(&mut self.board);
                            self.state = GameState::Dying(Beat::One);
                        }
                    }
                    for idx in 0..self.hatched_beasts.len() {
                        let action =
                            self.super_beasts[idx].advance(&mut self.board, self.player.position);
                        self.push_to_log(GameLogEntry::HatchedBeastMoved {
                            idx,
                            new_pos: self.super_beasts[idx].position,
                        });

                        if action == BeastAction::PlayerKilled {
                            self.player.lives -= 1;
                            self.player.respawn(&mut self.board);
                            self.state = GameState::Dying(Beat::One);
                        }
                    }
                }

                // end game through no more lives left
                if self.player.lives == 0 {
                    self.state = GameState::GameOver;
                    break;
                }

                // render with Dying and Killing animation
                self.render_with_state();
                self.beat = self.beat.next();
                last_tick = Instant::now();
            }
        }
    }

    fn handle_death_state(&mut self) {
        println!("{}", self.render_death_screen());

        loop {
            if let Ok(byte) = self.input_listener.try_recv() {
                match byte as char {
                    ' ' => {
                        self.start_new_game();
                        break;
                    }
                    '\n' => {
                        self.state = GameState::ProveExecution;
                        break;
                    }
                    'h' | 'H' => {
                        self.state = GameState::Help;
                        break;
                    }
                    'q' | 'Q' => {
                        self.state = GameState::Quit;
                        break;
                    }
                    _ => {}
                }
            }
        }
    }

    fn handle_win_state(&mut self) {
        println!("{}", self.render_winning_screen());

        loop {
            if let Ok(byte) = self.input_listener.try_recv() {
                match byte as char {
                    ' ' => {
                        self.start_new_game();
                        break;
                    }
                    '\n' => {
                        self.state = GameState::ProveExecution;
                        break;
                    }
                    'h' | 'H' => {
                        self.state = GameState::Help;
                        break;
                    }
                    'q' | 'Q' => {
                        self.state = GameState::Quit;
                        break;
                    }
                    _ => {}
                }
            }
        }
    }

    fn handle_level_complete(&mut self) {
        let handle = Self::render_loader_in_new_thread("LEVEL COMPLETED.", 5000, true);
        let _ = handle.join();

        if let Some(level) = self.level.next() {
            let board_terrain_info = Board::generate_terrain(level);
            let board = Board::new(board_terrain_info.buffer);

            let level_log = LevelLog {
                level,
                board: board.to_vec(),
                game_log: vec![],
            };
            self.levels_completion_log.push(level_log);
            self.board = board;
            self.level = level;
            self.level_start = Instant::now();
            self.common_beasts = board_terrain_info.common_beasts;
            self.super_beasts = board_terrain_info.super_beasts;
            self.eggs = board_terrain_info.eggs;
            self.hatched_beasts = board_terrain_info.hatched_beasts;
            self.player.position = board_terrain_info.player.position;
            self.player.score += self.level.get_config().completion_score;
            self.state = GameState::Playing;
        } else {
            self.has_won = true;
            self.state = GameState::Won;
        }
    }

    fn handle_help_state(&mut self) {
        let pause = Instant::now();
        let mut help = Help::new();
        println!("{}", help.render());

        loop {
            if let Ok(byte) = self.input_listener.try_recv() {
                if byte == 0x1B {
                    let second = self.input_listener.recv().unwrap_or(0);
                    let third = self.input_listener.recv().unwrap_or(0);
                    if second == b'[' {
                        let mut render = false;
                        match third {
                            b'C' => {
                                help.next_page();
                                render = true;
                            }
                            b'D' => {
                                help.previous_page();
                                render = true;
                            }
                            _ => {}
                        }

                        if render {
                            println!("{}", help.render());
                        }
                    }
                } else {
                    match byte as char {
                        ' ' => {
                            self.level_start += pause.elapsed();
                            self.state = GameState::Playing;
                            break;
                        }
                        'q' | 'Q' => {
                            self.state = GameState::Quit;
                            break;
                        }
                        _ => {}
                    }
                }
            }
        }
    }

    fn handle_prove_execution_state(&mut self) {
        let proving_alert_handle = Self::render_loader_in_new_thread(
            "Proving this can take a few minutes...",
            30000,
            true,
        );

        // If it hasn't won, then don't include the last level as it wasn't completed
        let levels_completion_log = if self.has_won {
            self.levels_completion_log.clone()
        } else {
            let mut levels_log = self.levels_completion_log.clone();
            levels_log.pop();
            levels_log
        };

        let handle = std::thread::spawn(move || {
            let res = prove(levels_completion_log);
            if let Ok(receipt) = res {
                save_proof(receipt).expect("To be able to write proof");
            } else {
                panic!("Could prove program")
            }
        });

        let res = handle.join();
        let _ = proving_alert_handle.join();

        if self.has_won {
            println!("{}", self.render_winning_screen());
        } else {
            println!("{}", self.render_death_screen());
        }

        let msg = if let Ok(_) = res {
            "Execution proven and stored!"
        } else {
            "Could not prove program, try again..."
        };
        let handle = Self::render_loader_in_new_thread(msg, 3000, false);
        let _ = handle.join();
        self.state = GameState::Quit;
    }

    fn get_secs_remaining(&self) -> u64 {
        let elapsed = Instant::now().duration_since(self.level_start);
        let total_time = self.level.get_config().time;
        if total_time > elapsed {
            total_time - elapsed
        } else {
            Duration::from_secs(0)
        }
        .as_secs()
    }

    fn get_game_statistics(&self) -> String {
        let mut output = String::new();
        output.push_str(&format!("{ANSI_LEFT_BORDER}     REACHED SCORE:     {ANSI_BOLD}{:<4}{ANSI_RESET}                                                                        {ANSI_RIGHT_BORDER}\n", self.player.score));
        output.push_str(&format!("{ANSI_LEFT_BORDER}     LEVEL REACHED:     {ANSI_BOLD}{:<2}{ANSI_RESET}                                                                          {ANSI_RIGHT_BORDER}\n", self.level.to_string()));
        output.push_str(&format!("{ANSI_LEFT_BORDER}     BEASTS KILLED:     {ANSI_BOLD}{:<4}{ANSI_RESET}                                                                        {ANSI_RIGHT_BORDER}\n", self.player.beasts_killed.to_string()));
        output.push_str(&format!("{ANSI_LEFT_BORDER}     BLOCKS MOVED:      {ANSI_BOLD}{:<6}{ANSI_RESET}                                                                      {ANSI_RIGHT_BORDER}\n", self.player.blocks_moved.to_string()));
        output.push_str(&format!("{ANSI_LEFT_BORDER}     DISTANCE TRAVELED: {ANSI_BOLD}{:<6}{ANSI_RESET}                                                                      {ANSI_RIGHT_BORDER}\n", self.player.distance_traveled.to_string()));
        output
    }

    fn render_header(output: &mut String) {
        output.push('\n');
        output.push_str(" ╔╗  ╔═╗ ╔═╗ ╔═╗ ╔╦╗\n");
        output.push_str(" ╠╩╗ ║╣  ╠═╣ ╚═╗  ║\n");
        output.push_str(" ╚═╝ ╚═╝ ╩ ╩ ╚═╝  ╩\n");
    }

    fn render_footer(&self) -> String {
        let mut output = String::new();
        let secs_remaining = self.get_secs_remaining();
        let minutes = secs_remaining / 60;
        let seconds = secs_remaining % 60;
        let elapsed = self.level_start.elapsed();
        let tick_count = elapsed.as_millis() / TICK_DURATION.as_millis();
        let timer_color = if tick_count % 2 == 0 && minutes == 0 && seconds < 20
            || minutes == 0 && seconds == 0
        {
            "\x1b[31m"
        } else {
            ANSI_RESET_FONT
        };

        let lives = if self.player.lives == 1 {
            format!("\x1B[31m{}{ANSI_RESET_FONT}", self.player.lives)
        } else {
            self.player.lives.to_string()
        };

        output.push_str("⌂⌂                                      ");
        output.push_str("  Beasts: ");
        output.push_str(&format!(
            "{ANSI_BOLD}{:>2}{ANSI_RESET}",
            (self.common_beasts.len() + self.super_beasts.len() + self.hatched_beasts.len())
                .to_string()
        ));
        output.push_str("  Level: ");
        output.push_str(&format!(
            "{ANSI_BOLD}{:>2}{ANSI_RESET}",
            self.level.to_string()
        ));
        output.push_str("  Time: ");
        output.push_str(&format!(
            "{ANSI_BOLD}{timer_color}{:02}:{:02}{ANSI_RESET}",
            minutes, seconds
        ));
        output.push_str("  Lives: ");
        output.push_str(&format!("{ANSI_BOLD}{lives}{ANSI_RESET}"));
        output.push_str("  Score: ");
        output.push_str(&format!("{ANSI_BOLD}{:>4}{ANSI_RESET}", self.player.score));
        output.push_str(&format!(" {}\n\n", Tile::Player));

        output
    }

    fn render_top_frame() -> String {
        format!("\x1b[33m▛{}▜{ANSI_RESET_FONT}\n", "▀▀".repeat(BOARD_WIDTH))
    }

    fn render_bottom_frame() -> String {
        format!("\x1b[33m▙{}▟{ANSI_RESET_FONT}\n", "▄▄".repeat(BOARD_WIDTH))
    }

    fn render_intro() -> String {
        let mut output = String::new();
        Self::render_header(&mut output);
        output.push_str(&Self::render_top_frame());
        output.push_str(&LOGO.join("\n"));
        output.push('\n');
        output.push_str(&format!("{ANSI_LEFT_BORDER}                                                                                                    {ANSI_RIGHT_BORDER}\n"));
        output.push_str(&format!("{ANSI_LEFT_BORDER}                               Written and Developed by the following                               {ANSI_RIGHT_BORDER}\n"));
        output.push_str(&format!("{ANSI_LEFT_BORDER}                                         Dominik Wilkowski                                          {ANSI_RIGHT_BORDER}\n"));
        output.push_str(&format!("{ANSI_LEFT_BORDER}                                                                                                    {ANSI_RIGHT_BORDER}\n"));
        output.push_str(&format!("{ANSI_LEFT_BORDER}                                                                                                    {ANSI_RIGHT_BORDER}\n"));
        output.push_str(&format!("{ANSI_LEFT_BORDER}                                                                                                    {ANSI_RIGHT_BORDER}\n"));
        output.push_str(&format!("{ANSI_LEFT_BORDER}                               Faithfully recreated from the work of                                {ANSI_RIGHT_BORDER}\n"));
        output.push_str(&format!("{ANSI_LEFT_BORDER}                      Dan Baker , Alan Brown , Mark Hamilton , Derrick Shadel                       {ANSI_RIGHT_BORDER}\n"));
        output.push_str(&format!("{ANSI_LEFT_BORDER}                                                                                                    {ANSI_RIGHT_BORDER}\n"));
        output.push_str(&format!("{ANSI_LEFT_BORDER}                                                                                                    {ANSI_RIGHT_BORDER}\n"));
        output.push_str(&format!("{ANSI_LEFT_BORDER}                                                                                                    {ANSI_RIGHT_BORDER}\n"));
        output.push_str(&format!("{ANSI_LEFT_BORDER}             NOTICE:    This is a Free copy of BEAST. You may copy it and give it away.             {ANSI_RIGHT_BORDER}\n"));
        output.push_str(&format!("{ANSI_LEFT_BORDER}                        If you enjoy the game, please send a contribution ($20) to                  {ANSI_RIGHT_BORDER}\n"));
        output.push_str(&format!("{ANSI_LEFT_BORDER}                        Dan Baker, PO BOX 1174, Orem UT 84057                                       {ANSI_RIGHT_BORDER}\n"));
        output.push_str(&format!("{ANSI_LEFT_BORDER}                                                                                                    {ANSI_RIGHT_BORDER}\n"));
        output.push_str(&format!("{ANSI_LEFT_BORDER}                                                                                                    {ANSI_RIGHT_BORDER}\n"));
        output.push_str(&format!("{ANSI_LEFT_BORDER}                                                                                                    {ANSI_RIGHT_BORDER}\n"));
        output.push_str(&format!("{ANSI_LEFT_BORDER}                                     Press {ANSI_BOLD}[SPACE]{ANSI_RESET} key to start                                     {ANSI_RIGHT_BORDER}\n"));
        output.push_str(&format!("{ANSI_LEFT_BORDER}                                         {ANSI_BOLD}[Q]{ANSI_RESET} Quit  {ANSI_BOLD}[H]{ANSI_RESET} Help  {ANSI_BOLD}                                       {ANSI_RIGHT_BORDER}\n"));
        output.push_str(&format!("{ANSI_LEFT_BORDER}                                                                                                    {ANSI_RIGHT_BORDER}\n"));
        output.push_str(&Self::render_bottom_frame());
        output.push_str("\n\n");

        output
    }

    fn render_death_screen(&self) -> String {
        let mut output = String::new();
        let top_pos = format!(
            "\x1b[{}F",
            ANSI_FRAME_SIZE + ANSI_BOARD_HEIGHT + ANSI_FRAME_SIZE + ANSI_FOOTER_HEIGHT
        );

        output.push_str(&top_pos);
        output.push_str(&LOGO.join("\n"));
        output.push('\n');
        output.push_str(&format!("{ANSI_LEFT_BORDER}                                                                                                    {ANSI_RIGHT_BORDER}\n"));
        output.push_str(&format!("{ANSI_LEFT_BORDER}                                                                                                    {ANSI_RIGHT_BORDER}\n"));
        output.push_str(&format!("{ANSI_LEFT_BORDER}                                                                                                    {ANSI_RIGHT_BORDER}\n"));
        if self.player.lives == 0 {
            output.push_str(&format!("{ANSI_LEFT_BORDER}                                              {ANSI_BOLD}YOU DIED{ANSI_RESET}                                              {ANSI_RIGHT_BORDER}\n"));
        } else {
            output.push_str(&format!("{ANSI_LEFT_BORDER}                                          {ANSI_BOLD}YOUR TIME RAN OUT{ANSI_RESET}                                         {ANSI_RIGHT_BORDER}\n"));
        }
        output.push_str(&format!("{ANSI_LEFT_BORDER}                                                                                                    {ANSI_RIGHT_BORDER}\n"));
        output.push_str(&format!("{ANSI_LEFT_BORDER}                                                                                                    {ANSI_RIGHT_BORDER}\n"));
        output.push_str(&self.get_game_statistics());
        output.push_str(&format!("{ANSI_LEFT_BORDER}                                                                                                    {ANSI_RIGHT_BORDER}\n"));
        output.push_str(&format!("{ANSI_LEFT_BORDER}                                                                                                    {ANSI_RIGHT_BORDER}\n"));
        output.push_str(&format!("{ANSI_LEFT_BORDER}                                                                                                    {ANSI_RIGHT_BORDER}\n"));
        output.push_str(&format!("{ANSI_LEFT_BORDER}                                                                                                    {ANSI_RIGHT_BORDER}\n"));
        output.push_str(&format!("{ANSI_LEFT_BORDER}                               PRESS {ANSI_BOLD}[ENTER]{ANSI_RESET} TO PROVE YOUR EXECUTION                                {ANSI_RIGHT_BORDER}\n"));
        output.push_str(&format!("{ANSI_LEFT_BORDER}                                                                                                    {ANSI_RIGHT_BORDER}\n"));
        output.push_str(&format!("{ANSI_LEFT_BORDER}                                  Press {ANSI_BOLD}[SPACE]{ANSI_RESET} key to play again                                   {ANSI_RIGHT_BORDER}\n"));
        output.push_str(&format!("{ANSI_LEFT_BORDER}                                     Press {ANSI_BOLD}[Q]{ANSI_RESET} to exit the game                                     {ANSI_RIGHT_BORDER}\n"));
        output.push_str(&format!("{ANSI_LEFT_BORDER}                                                                                                    {ANSI_RIGHT_BORDER}\n"));
        output.push_str(&Self::render_bottom_frame());
        output.push_str(&self.render_footer());

        output
    }

    fn render_winning_screen(&self) -> String {
        let mut output = String::new();
        let top_pos = format!(
            "\x1b[{}F",
            ANSI_FRAME_SIZE + ANSI_BOARD_HEIGHT + ANSI_FRAME_SIZE + ANSI_FOOTER_HEIGHT
        );

        output.push_str(&top_pos);
        output.push_str(&LOGO.join("\n"));
        output.push('\n');
        output.push_str(&format!("{ANSI_LEFT_BORDER}                                                                                                    {ANSI_RIGHT_BORDER}\n"));
        output.push_str(&format!("{ANSI_LEFT_BORDER}                                                                                                    {ANSI_RIGHT_BORDER}\n"));
        output.push_str(&format!("{ANSI_LEFT_BORDER}                                                                                                    {ANSI_RIGHT_BORDER}\n"));
        output.push_str(&format!("{ANSI_LEFT_BORDER}                                               {ANSI_BOLD}YOU WON{ANSI_RESET}                                              {ANSI_RIGHT_BORDER}\n"));
        output.push_str(&format!("{ANSI_LEFT_BORDER}                                                                                                    {ANSI_RIGHT_BORDER}\n"));
        output.push_str(&format!("{ANSI_LEFT_BORDER}                                                                                                    {ANSI_RIGHT_BORDER}\n"));
        output.push_str(&self.get_game_statistics());
        output.push_str(&format!("{ANSI_LEFT_BORDER}                                                                                                    {ANSI_RIGHT_BORDER}\n"));
        output.push_str(&format!("{ANSI_LEFT_BORDER}                                                                                                    {ANSI_RIGHT_BORDER}\n"));
        output.push_str(&format!("{ANSI_LEFT_BORDER}                                                                                                    {ANSI_RIGHT_BORDER}\n"));
        output.push_str(&format!("{ANSI_LEFT_BORDER}                                                                                                    {ANSI_RIGHT_BORDER}\n"));
        output.push_str(&format!("{ANSI_LEFT_BORDER}                                PRESS {ANSI_BOLD}[ENTER]{ANSI_RESET} TO PROVE YOUR EXECUTION                               {ANSI_RIGHT_BORDER}\n"));
        output.push_str(&format!("{ANSI_LEFT_BORDER}                                                                                                    {ANSI_RIGHT_BORDER}\n"));
        output.push_str(&format!("{ANSI_LEFT_BORDER}                                  Press {ANSI_BOLD}[SPACE]{ANSI_RESET} key to play again                                   {ANSI_RIGHT_BORDER}\n"));
        output.push_str(&format!("{ANSI_LEFT_BORDER}                                     Press {ANSI_BOLD}[Q]{ANSI_RESET} to exit the game                                     {ANSI_RIGHT_BORDER}\n"));
        output.push_str(&format!("{ANSI_LEFT_BORDER}                                                                                                    {ANSI_RIGHT_BORDER}\n"));
        output.push_str(&Self::render_bottom_frame());
        output.push_str("\n\n");

        output
    }

    fn render_board(&self) -> String {
        let top_pos = format!(
            "\x1b[{}F",
            ANSI_FRAME_SIZE + ANSI_BOARD_HEIGHT + ANSI_FRAME_SIZE + ANSI_FOOTER_HEIGHT
        );
        let bottom_pos = format!("\x1b[{}E", ANSI_FRAME_SIZE);
        let mut output = String::new();

        output.push_str(&top_pos);
        output.push_str(&self.board.render());
        output.push_str(&Self::render_bottom_frame());
        output.push_str(&self.render_footer());
        output.push_str(&bottom_pos);
        output
    }

    fn render_with_state(&mut self) {
        match self.state {
            GameState::Dying(beat) => match beat {
                Beat::One => {
                    self.state = GameState::Dying(Beat::Two);
                    print!("\x1b[48;5;196m");
                }
                Beat::Two => {
                    self.state = GameState::Dying(Beat::Three);
                    print!("\x1b[48;5;208m");
                }
                Beat::Three | Beat::Four | Beat::Five => {
                    self.state = GameState::Playing;
                    print!("{ANSI_RESET_BG}");
                }
            },
            GameState::Killing(beat) => match beat {
                Beat::One => {
                    self.state = GameState::Killing(Beat::Two);
                    print!("\x1b[48;2;51;51;51m");
                }
                Beat::Two | Beat::Three | Beat::Four | Beat::Five => {
                    self.state = GameState::Playing;
                    print!("{ANSI_RESET_BG}");
                }
            },
            GameState::Playing => {
                print!("{ANSI_RESET_BG}");
            }
            _ => {}
        }
        print!("{}", self.render_board());
    }

    fn render_loader_in_new_thread(
        message: &str,
        total_duration_ms: u128,
        show_progress: bool,
    ) -> JoinHandle<()> {
        let message = message.to_string();
        std::thread::spawn(move || {
            let time = Instant::now();
            let mut last_update = time;
            print!("{}", Self::alert(&message, 0));
            loop {
                let elapsed = time.elapsed().as_millis();
                if elapsed > total_duration_ms {
                    break;
                }
                if last_update.elapsed().as_millis() > 500 {
                    let progress = if show_progress {
                        std::cmp::min(100, ((elapsed * 100) / total_duration_ms) as usize + 8)
                    } else {
                        0
                    };
                    print!("{}", Self::alert(&message, progress));
                    last_update = Instant::now();
                }
            }
        })
    }

    fn alert(msg: &str, progress: usize) -> String {
        let alert_height = 4;
        let top_pos =
            ((ANSI_BOARD_HEIGHT + ANSI_FRAME_SIZE) / 2) + ANSI_FOOTER_HEIGHT + alert_height;
        let bottom_pos = top_pos - alert_height;
        let left_pad = format!(
            "\x1b[{:.0}C",
            (((BOARD_WIDTH * 2 + ANSI_FRAME_SIZE + ANSI_FRAME_SIZE) / 2) - ((msg.len() + 4) / 2))
        );

        let progress_bar = format!("{:▁<width$}", "", width = (msg.len() * progress) / 100);
        format!(
            "\x1b[{top_pos}F{left_pad}┌{border:─<width$}┐\n{left_pad}│ {msg} │\n{left_pad}│ \x1B[38;5;235m{progress_bar:<msg_width$}{ANSI_RESET_FONT} │\n{left_pad}└{border:─<width$}┘\n\x1b[{bottom_pos:.0}E",
            border = "",
            width = msg.len() + 2,
            msg_width = msg.len()
        )
    }

    fn push_to_log(&mut self, log: GameLogEntry) {
        self.levels_completion_log[self.level.number() as usize - 1]
            .game_log
            .push(log);
    }
}
