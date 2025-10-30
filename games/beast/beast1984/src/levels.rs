use std::fs::File;
use std::io::{BufReader, Read};
use reqwest::blocking::Client;
use std::time::Duration;
use game_logic::common::game::GameJson;

enum FileHosting {
    LOCAL,
    WEB,
}

struct GameFile {
    hosting: FileHosting,
    location: &'static str,
}

const GAME_FILE: GameFile = game_file();

const fn game_file() -> GameFile {
    #[cfg(feature = "devnet")]
    return GameFile {
        hosting: FileHosting::LOCAL,
        location: "levels/devnet.json",
    };

    #[cfg(feature = "holesky-stage")]
    return GameFile {
        hosting: FileHosting::WEB,
        location: "https://raw.githubusercontent.com/yetanotherco/zk_arcade/refs/heads/main/games/beast/levels/holesky-stage.json",
    };

    #[cfg(feature = "holesky")]
    return GameFile {
        hosting: FileHosting::WEB,
        location: "https://raw.githubusercontent.com/yetanotherco/zk_arcade/refs/heads/main/games/beast/levels/holesky.json",
    };

    #[cfg(feature = "mainnet")]
    return GameFile {
        hosting: FileHosting::WEB,
        location: "https://beast.zkarcade.com/mainnet.json",
    };

    #[cfg(feature = "sepolia")]
    return GameFile {
        hosting: FileHosting::WEB,
        location: "https://beast.zkarcade.com/sepolia.json",
    };

    GameFile {
        hosting: FileHosting::LOCAL,
        location: "",
    }
}

fn read_local_file(path: &str) -> String {
    println!("Reading game levels from local file: {}", path);
    let file = File::open(path).expect("Cannot open game levels file");
    let mut reader = BufReader::new(file);
    let mut content = String::new();
    reader
        .read_to_string(&mut content)
        .expect("Failed to read game levels file");
    content
}

fn fetch_web_file(url: &str) -> String {
    println!("Fetching game levels from web: {}", url);
    let client = Client::builder()
        .timeout(Duration::from_secs(60))
        .build()
        .expect("Failed to build HTTP client");
    let response = client
        .get(url)
        .send()
        .expect("Failed to send HTTP request");
    response
        .text()
        .expect("Failed to read response text")
}

pub fn get_game_levels() -> Vec<GameJson> {
    let json_content = match GAME_FILE.hosting {
        FileHosting::LOCAL => read_local_file(GAME_FILE.location),
        FileHosting::WEB => fetch_web_file(GAME_FILE.location),
    };

    // Parse JSON content
    serde_json::from_str(&json_content).expect("Invalid JSON format")
}