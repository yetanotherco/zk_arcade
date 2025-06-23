use game_logic::proving::{LevelLog, ProgramInput};
use risc0_zkvm::{ExecutorEnv, ProverOpts, Receipt, default_prover};

include!(concat!(env!("OUT_DIR"), "/methods.rs"));

#[derive(Debug, Clone)]
pub enum ProvingError {
    WriteInput(String),
    BuildExecutor(String),
    Prove(String),
    Verification(String),
}

pub fn prove(levels_log: Vec<LevelLog>) -> Result<Receipt, ProvingError> {
    let mut env_builder = ExecutorEnv::builder();

    // write input data
    let input = ProgramInput { levels_log };
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
