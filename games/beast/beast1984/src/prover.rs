use game_logic::proving::{LevelLog, ProgramInput};
use risc0_zkvm::{ExecutorEnv, ProverOpts, Receipt, default_prover};

include!(concat!(env!("OUT_DIR"), "/methods.rs"));

#[derive(Debug, Clone)]
pub enum ProvingError {
    WriteInput(String),
    BuildExecutor(String),
    Prove(String),
    Verification(String),
    SavingProof(String),
}

pub fn prove(levels_log: Vec<LevelLog>, address: String) -> Result<Receipt, ProvingError> {
    let mut env_builder = ExecutorEnv::builder();

    // write input data
    let input = ProgramInput { levels_log, address };
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

pub fn save_proof(receipt: Receipt) -> Result<(), ProvingError> {
    let serialized = bincode::serialize(&receipt.inner).expect("Failed to serialize the receipt");

    std::fs::write("./proof.bin", serialized)
        .map_err(|e| ProvingError::SavingProof(e.to_string()))?;

    std::fs::write(
        "proof_id.bin",
        image_id_words_to_bytes(BEAST_1984_PROGRAM_ID),
    )
    .map_err(|e| ProvingError::SavingProof(e.to_string()))?;

    std::fs::write("public_inputs.bin", receipt.journal.bytes)
        .map_err(|e| ProvingError::SavingProof(e.to_string()))?;

    Ok(())
}

fn image_id_words_to_bytes(image_id: [u32; 8]) -> [u8; 32] {
    let mut bytes = [0; 32];
    for i in 0..8 {
        bytes[4 * i..4 * (i + 1)].copy_from_slice(&image_id[i].to_le_bytes());
    }
    bytes
}
