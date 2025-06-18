//! this module allows to display paginated highscores and publish new scores

use std::{
    sync::{Arc, Mutex, mpsc::Receiver},
    thread,
    time::Duration,
};

use crate::game::{ANSI_BOARD_HEIGHT, ANSI_FOOTER_HEIGHT, ANSI_FRAME_SIZE};
use game_logic::{
    ANSI_BOLD, ANSI_LEFT_BORDER, ANSI_RESET, ANSI_RESET_BG, ANSI_RESET_FONT, ANSI_RIGHT_BORDER,
    LOGO, Tile, common::levels::Level,
};

/// the height of the window
const WINDOW_HEIGHT: usize = 28;
/// where the loading is displayed
const LOADING_POSITION: usize = 13;
/// the two types of backgrounds displayed in the score table
const ALT_BG: [&str; 2] = [ANSI_RESET_BG, "\x1B[48;5;233m"];

/// the state our highscore can be in
#[derive(Debug, Clone, PartialEq)]
pub enum State {
    /// we're loading the data from the server
    Loading,
    /// we're displaying the highscore
    Idle,
    /// we encountered an error
    Error,
    /// we end the highscore
    Quit,
}

/// the highscore fetches its own data from the server and keeps track of it's scroll position
pub struct Highscore {
    scroll: usize,
    screen_array: Arc<Mutex<Vec<String>>>,
    pub state: Arc<Mutex<State>>,
}

impl Highscore {
    fn new() -> Self {
        let mut screen_array = Vec::with_capacity(112);
        screen_array.extend(LOGO.iter().map(|&s| s.to_string()));
        screen_array.push(format!(
			"{ANSI_LEFT_BORDER}                                            {ANSI_BOLD}HIGHSCORES{ANSI_RESET}                                              {ANSI_RIGHT_BORDER}"
		));
        screen_array.push(format!(
			"{ANSI_LEFT_BORDER}     \x1B[38;5;241mPOS  SCORE  NAME                                                LEVEL  DATE{ANSI_RESET_FONT}                    {ANSI_RIGHT_BORDER}",
		));
        screen_array.push(format!("{ANSI_LEFT_BORDER}                                                                                                    {ANSI_RIGHT_BORDER}"));

        for i in 1..=1000 {
            let bg = ALT_BG[(i + 1) % 2];
            screen_array.push(format!(
			"{ANSI_LEFT_BORDER}   {bg}  {i:<3}  {ANSI_BOLD}    -{ANSI_RESET}{bg}  ...                                                                             {ANSI_RESET_BG}   {ANSI_RIGHT_BORDER}"));
        }

        Self {
            scroll: 0,
            screen_array: Arc::new(Mutex::new(screen_array)),
            state: Arc::new(Mutex::new(State::Loading)),
        }
    }

    /// create a new instance of highscore and default to a loading state
    pub fn new_loading() -> Self {
        let highscore = Self::new();
        highscore.fetch_data();
        highscore
    }

    /// create a new instance of highscore and default to an idle state
    pub fn new_idle() -> Self {
        let highscore = Self::new();
        *highscore.state.lock().unwrap() = State::Idle;
        highscore
    }

    /// listen to stdin to capture the name you want to enter into the highscore
    pub fn handle_enter_name(
        &mut self,
        input_listener: &Receiver<u8>,
        score: u16,
        level: Level,
    ) -> Option<()> {
        let mut name = String::new();

        println!("{}", Self::render_score_input_screen(name.clone()));

        loop {
            if let Ok(byte) = input_listener.try_recv() {
                match byte as char {
                    '\n' => {
                        if !name.is_empty() {
                            break;
                        }
                    }
                    '\u{7f}' | '\x08' => {
                        name.pop();
                        println!("{}", Self::render_score_input_screen(name.clone()));
                    }
                    ' ' => {
                        name.push(' ');
                        println!("{}", Self::render_score_input_screen(name.clone()));
                    }
                    c @ ('a'..='z'
                    | 'A'..='Z'
                    | '0'..='9'
                    | '!'
                    | '@'
                    | '#'
                    | '$'
                    | '%'
                    | '^'
                    | '&'
                    | '*'
                    | '('
                    | ')'
                    | '_'
                    | '+'
                    | '='
                    | '-'
                    | ':'
                    | ';'
                    | '"'
                    | '\''
                    | '?'
                    | '<'
                    | '>'
                    | '['
                    | ']'
                    | '{'
                    | '}'
                    | '|'
                    | '\\'
                    | '/'
                    | ','
                    | '.') => {
                        if name.len() < 20 {
                            name.push(c);
                            println!("{}", Self::render_score_input_screen(name.clone()));
                        }
                    }
                    _ => {}
                }
            }
        }

        *self.state.lock().unwrap() = State::Loading;
        self.render_loading();
        println!("{}", Self::render_loading_screen());
        self.submit_name(&name, score, level)
    }

    /// scroll down
    pub fn scroll_down(&mut self) {
        self.scroll = if self.scroll >= 85 {
            85
        } else {
            self.scroll + 1
        };
    }

    /// scroll up
    pub fn scroll_up(&mut self) {
        self.scroll = if self.scroll == 0 { 0 } else { self.scroll - 1 };
    }

    /// render the highscore while taking into account the scroll position
    pub fn render(&self) -> String {
        let state = self.state.lock().unwrap();
        let screen_array = self.screen_array.lock().unwrap();
        match *state {
            State::Loading => {
                self.render_loading();
                Self::render_loading_screen()
            }
            State::Idle => Self::render_score(screen_array.clone(), self.scroll),
            State::Error => String::new(),
            State::Quit => String::new(),
        }
    }

    /// fetch the data from the server
    pub fn fetch_data(&self) {
        // let state_clone = Arc::clone(&self.state);
        // let screen_array_clone = Arc::clone(&self.screen_array);
        // let scroll_clone = self.scroll;
    }

    fn submit_name(&self, _name: &str, _score: u16, _level: Level) -> Option<()> {
        // let state_clone = Arc::clone(&self.state);
        // let name_clone = name.to_string();

        None
    }

    /// render the loading screen
    pub fn render_loading_screen() -> String {
        let mut output = String::new();
        let top_pos = format!(
            "\x1b[{}F",
            ANSI_FRAME_SIZE + ANSI_BOARD_HEIGHT + ANSI_FRAME_SIZE + ANSI_FOOTER_HEIGHT
        );
        let bottom_pos = format!("\x1b[{}E", ANSI_FRAME_SIZE + ANSI_FOOTER_HEIGHT);

        output.push_str(&top_pos);
        output.push_str(&LOGO.join("\n"));
        output.push('\n');
        output.push_str(&format!("{ANSI_LEFT_BORDER}                                                                                                    {ANSI_RIGHT_BORDER}\n"));
        output.push_str(&format!("{ANSI_LEFT_BORDER}                                                                                                    {ANSI_RIGHT_BORDER}\n"));
        output.push_str(&format!("{ANSI_LEFT_BORDER}                                                                                                    {ANSI_RIGHT_BORDER}\n"));
        output.push_str(&format!("{ANSI_LEFT_BORDER}                                                                                                    {ANSI_RIGHT_BORDER}\n"));
        output.push_str(&format!("{ANSI_LEFT_BORDER}                                                                                                    {ANSI_RIGHT_BORDER}\n"));
        output.push_str(&format!("{ANSI_LEFT_BORDER}                                                                                                    {ANSI_RIGHT_BORDER}\n"));
        output.push_str(&format!("{ANSI_LEFT_BORDER}                                                                                                    {ANSI_RIGHT_BORDER}\n"));
        output.push_str(&format!("{ANSI_LEFT_BORDER}                                                                                                    {ANSI_RIGHT_BORDER}\n"));
        output.push_str(&format!("{ANSI_LEFT_BORDER}                                                                                                    {ANSI_RIGHT_BORDER}\n"));
        output.push_str(&format!("{ANSI_LEFT_BORDER}                                                                                                    {ANSI_RIGHT_BORDER}\n"));
        output.push_str(&format!("{ANSI_LEFT_BORDER}                                                                                                    {ANSI_RIGHT_BORDER}\n"));
        output.push_str(&format!("{ANSI_LEFT_BORDER}                                                                                                    {ANSI_RIGHT_BORDER}\n"));
        output.push_str(&format!("{ANSI_LEFT_BORDER}                                                                                                    {ANSI_RIGHT_BORDER}\n"));
        output.push_str(&format!("{ANSI_LEFT_BORDER}                                                                                                    {ANSI_RIGHT_BORDER}\n"));
        output.push_str(&format!("{ANSI_LEFT_BORDER}                                                                                                    {ANSI_RIGHT_BORDER}\n"));
        output.push_str(&format!("{ANSI_LEFT_BORDER}                                                                                                    {ANSI_RIGHT_BORDER}\n"));
        output.push_str(&format!("{ANSI_LEFT_BORDER}                                                                                                    {ANSI_RIGHT_BORDER}\n"));
        output.push_str(&format!("{ANSI_LEFT_BORDER}                                                                                                    {ANSI_RIGHT_BORDER}\n"));
        output.push_str(&format!("{ANSI_LEFT_BORDER}                                                                                                    {ANSI_RIGHT_BORDER}\n"));
        output.push_str(&format!("{ANSI_LEFT_BORDER}                                  {ANSI_BOLD}[SPACE]{ANSI_RESET} Play  {ANSI_BOLD}[Q]{ANSI_RESET} Quit  {ANSI_BOLD}[H]{ANSI_RESET} Help                                  {ANSI_RIGHT_BORDER}\n"));
        output.push_str(&bottom_pos);

        output
    }

    fn render_score_input_screen(name: String) -> String {
        let mut output = String::new();
        let top_pos = format!(
            "\x1b[{}F",
            ANSI_FRAME_SIZE + ANSI_BOARD_HEIGHT + ANSI_FRAME_SIZE + ANSI_FOOTER_HEIGHT
        );
        let bottom_pos = format!("\x1b[{}E", ANSI_FRAME_SIZE + ANSI_FOOTER_HEIGHT);

        output.push_str(&top_pos);
        output.push_str(&LOGO.join("\n"));
        output.push('\n');
        output.push_str(&format!("{ANSI_LEFT_BORDER}                                                                                                    {ANSI_RIGHT_BORDER}\n"));
        output.push_str(&format!("{ANSI_LEFT_BORDER}                                                                                                    {ANSI_RIGHT_BORDER}\n"));
        output.push_str(&format!("{ANSI_LEFT_BORDER}                                                                                                    {ANSI_RIGHT_BORDER}\n"));
        output.push_str(&format!("{ANSI_LEFT_BORDER}                                                                                                    {ANSI_RIGHT_BORDER}\n"));
        output.push_str(&format!("{ANSI_LEFT_BORDER}                                                                                                    {ANSI_RIGHT_BORDER}\n"));
        output.push_str(&format!("{ANSI_LEFT_BORDER}                                                                                                    {ANSI_RIGHT_BORDER}\n"));
        output.push_str(&format!("{ANSI_LEFT_BORDER}                                                                                                    {ANSI_RIGHT_BORDER}\n"));
        output.push_str(&format!("{ANSI_LEFT_BORDER}                                        Enter your name below                                       {ANSI_RIGHT_BORDER}\n"));
        output.push_str(&format!("{ANSI_LEFT_BORDER}                        ┌──────────────────────────────────────────────────┐                        {ANSI_RIGHT_BORDER}\n"));
        output.push_str(&format!(
			"{ANSI_LEFT_BORDER}                        │{name:<50}│                        {ANSI_RIGHT_BORDER}\n"
		));
        output.push_str(&format!("{ANSI_LEFT_BORDER}                        └──────────────────────────────────────────────────┘                        {ANSI_RIGHT_BORDER}\n"));
        output.push_str(&format!("{ANSI_LEFT_BORDER}                                                                                                    {ANSI_RIGHT_BORDER}\n"));
        output.push_str(&format!("{ANSI_LEFT_BORDER}                                                                                                    {ANSI_RIGHT_BORDER}\n"));
        output.push_str(&format!("{ANSI_LEFT_BORDER}                                                                                                    {ANSI_RIGHT_BORDER}\n"));
        output.push_str(&format!("{ANSI_LEFT_BORDER}                                                                                                    {ANSI_RIGHT_BORDER}\n"));
        output.push_str(&format!("{ANSI_LEFT_BORDER}                                                                                                    {ANSI_RIGHT_BORDER}\n"));
        output.push_str(&format!("{ANSI_LEFT_BORDER}                                                                                                    {ANSI_RIGHT_BORDER}\n"));
        output.push_str(&format!("{ANSI_LEFT_BORDER}                                                                                                    {ANSI_RIGHT_BORDER}\n"));
        output.push_str(&format!("{ANSI_LEFT_BORDER}                                                                                                    {ANSI_RIGHT_BORDER}\n"));
        output.push_str(&format!("{ANSI_LEFT_BORDER}                                        {ANSI_BOLD}[ENTER]{ANSI_RESET} Submit score                                        {ANSI_RIGHT_BORDER}\n"));
        output.push_str(&bottom_pos);

        output
    }

    /// render the loading animaiton in a separate thread
    pub fn render_loading(&self) {
        let state_clone = Arc::clone(&self.state);

        thread::spawn(move || {
            let player = Tile::Player;
            let block = Tile::Block;
            let beast = Tile::CommonBeast;
            let loading_frames = [
                format!("{player}    {block}{beast}{block}"),
                format!("  {player}  {block}{beast}{block}"),
                format!("    {player}{block}{beast}{block}"),
                format!("      {player}{block}{block}"),
                format!("        {player}{block}"),
                format!("          {player}"),
                format!("{block}{beast}{block}    {player}"),
                format!("{block}{beast}{block}  {player}  "),
                format!("{block}{beast}{block}{player}    "),
                format!("{block}{block}{player}      "),
                format!("{block}{player}        "),
                format!("{player}          "),
            ];
            let mut frame_index = 0;

            while *state_clone.lock().unwrap() == State::Loading {
                let top_pos = format!(
                    "\x1b[{}F",
                    LOADING_POSITION + ANSI_FRAME_SIZE + ANSI_FOOTER_HEIGHT + 2
                );
                let bottom_pos = format!(
                    "\x1b[{}E",
                    LOADING_POSITION + ANSI_FRAME_SIZE + ANSI_FOOTER_HEIGHT
                );
                println!(
                    "{top_pos}{ANSI_LEFT_BORDER}                                               LOADING                                              {ANSI_RIGHT_BORDER}"
                );
                println!(
                    "{ANSI_LEFT_BORDER}                                            {:>12}                                            {ANSI_RIGHT_BORDER}{bottom_pos}",
                    loading_frames[frame_index]
                );
                frame_index += 1;
                if frame_index >= loading_frames.len() {
                    frame_index = 0;
                }
                std::thread::sleep(Duration::from_millis(100));
            }
        });
    }

    fn render_error(mut error: String) -> String {
        let top_pos = format!(
            "\x1b[{}F",
            LOADING_POSITION + ANSI_FRAME_SIZE + ANSI_FOOTER_HEIGHT + 1
        );
        let bottom_pos = format!(
            "\x1b[{}E",
            LOADING_POSITION + ANSI_FRAME_SIZE + ANSI_FOOTER_HEIGHT + 1
        );
        error.truncate(98);
        format!(
            "{top_pos}{ANSI_LEFT_BORDER}{error:^100}{ANSI_RESET}{ANSI_RIGHT_BORDER}{bottom_pos}"
        )
    }

    fn render_score(screen_array: Vec<String>, scroll: usize) -> String {
        let mut output = String::new();
        let top_pos = format!(
            "\x1b[{}F",
            ANSI_BOARD_HEIGHT + ANSI_FRAME_SIZE + ANSI_FOOTER_HEIGHT + 1
        );
        let bottom_pos = format!("\x1b[{}E", ANSI_FRAME_SIZE + ANSI_FOOTER_HEIGHT);
        let start = scroll;
        let end = (scroll + WINDOW_HEIGHT).min(screen_array.len());

        output.push_str(&top_pos);
        output.push_str(&screen_array[start..end].join("\n"));
        output.push('\n');
        output.push_str(&format!("{ANSI_LEFT_BORDER}                                                                                                    {ANSI_RIGHT_BORDER}\n"));
        output.push_str(&format!("{ANSI_LEFT_BORDER}            {ANSI_BOLD}[SPACE]{ANSI_RESET} Play  {ANSI_BOLD}[Q]{ANSI_RESET} Quit  {ANSI_BOLD}[H]{ANSI_RESET} Help  {ANSI_BOLD}[↓]{ANSI_RESET} Scroll Down  {ANSI_BOLD}[↑]{ANSI_RESET} Scroll Up  {ANSI_BOLD}[R]{ANSI_RESET} Refresh           {ANSI_RIGHT_BORDER}\n"));
        output.push_str(&bottom_pos);

        output
    }
}
