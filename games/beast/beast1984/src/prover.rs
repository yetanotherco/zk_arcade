use alloy::hex;
use game_logic::proving::{LevelLog, ProgramInput};
use risc0_zkvm::{default_prover, ExecutorEnv, ProverOpts, Receipt};
use serde::{Deserialize, Serialize};

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

    let address_bytes =
        hex::decode(address).map_err(|e| ProvingError::WriteInput(e.to_string()))?;
    // write input data
    let input = ProgramInput {
        levels_log,
        address: address_bytes,
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

fn write_chunk(buf: &mut Vec<u8>, chunk: &[u8]) {
    let len = chunk.len() as u32;
    buf.extend_from_slice(&len.to_le_bytes());
    buf.extend_from_slice(chunk);
}

pub fn save_proof(receipt: Receipt) -> Result<(), ProvingError> {
    let proof = bincode::serialize(&receipt.inner).expect("Failed to serialize receipt");
    let proof_id = image_id_words_to_bytes(BEAST_1984_PROGRAM_ID);
    let public_inputs = receipt.journal.bytes.clone();

    let mut buffer = Vec::new();

    write_chunk(&mut buffer, &proof);
    write_chunk(&mut buffer, &proof_id);
    write_chunk(&mut buffer, &public_inputs);

    std::fs::write("proof_data.bin", &buffer)
        .map_err(|e| ProvingError::SavingProof(e.to_string()))?;

    std::fs::write("proof.bin", &proof).map_err(|e| ProvingError::SavingProof(e.to_string()))?;
    std::fs::write("proof_id.bin", &proof_id)
        .map_err(|e| ProvingError::SavingProof(e.to_string()))?;
    std::fs::write("public_inputs.bin", &public_inputs)
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
