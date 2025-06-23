use game_logic::{
    BOARD_HEIGHT, BOARD_WIDTH, Tile,
    board::BoardTerrainInfo,
    common::levels::Level,
    proving::{GameLogEntry, ProgramInput},
};
use risc0_zkvm::{ExecutorEnv, ProverOpts, Receipt, default_prover};

include!(concat!(env!("OUT_DIR"), "/methods.rs"));

#[derive(Debug, Clone)]
pub enum ProvingError {
    WriteInput(String),
    BuildExecutor(String),
    Prove(String),
    Verification(String),
}

pub fn prove(
    initial_board: BoardTerrainInfo,
    level: Level,
    movements_log: Vec<GameLogEntry>,
) -> Result<Receipt, ProvingError> {
    let mut env_builder = ExecutorEnv::builder();

    let mut board = vec![vec![Tile::Empty; BOARD_WIDTH]; BOARD_HEIGHT];

    for i in 0..BOARD_HEIGHT {
        for e in 0..BOARD_WIDTH {
            board[i][e] = initial_board.buffer[i][e];
        }
    }

    // write input data
    let input = ProgramInput {
        board,
        level,
        game_log: movements_log,
    };
    env_builder
        .write(&input)
        .map_err(|e| ProvingError::WriteInput(e.to_string()))?;

    let env = env_builder
        .build()
        .map_err(|e| ProvingError::BuildExecutor(e.to_string()))?;

    let prover = default_prover();

    let receipt = prover
        .prove_with_opts(env, BEAST_1984_PROGRAM_ELF, &ProverOpts::composite())
        .map_err(|e| ProvingError::Prove(e.to_string()))?
        .receipt;

    receipt
        .verify(BEAST_1984_PROGRAM_ID)
        .map_err(|e| ProvingError::Verification(e.to_string()))?;

    Ok(receipt)
}
