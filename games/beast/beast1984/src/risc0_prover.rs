use aligned_sdk::common::types::ProvingSystemId;
use alloy::hex;
use chrono::Utc;
use game_logic::{
    common::levels::LevelJson,
    proving::{LevelLog, ProgramInput},
};
use risc0_zkvm::{default_prover, ExecutorEnv, ProverOpts, Receipt};

include!(concat!(env!("OUT_DIR"), "/methods.rs"));

#[derive(Debug, Clone)]
pub enum ProvingError {
    WriteInput(String),
    BuildExecutor(String),
    Prove(String),
    Verification(String),
    SavingProof(String),
}

const RISC0_PROVING_SYSTEM: [u8; 1] = [ProvingSystemId::Risc0 as u8];

pub fn prove(
    levels_log: Vec<LevelLog>,
    levels: Vec<LevelJson>,
    address: String,
) -> Result<Receipt, ProvingError> {
    let mut env_builder = ExecutorEnv::builder();

    let address_bytes =
        hex::decode(address).map_err(|e| ProvingError::WriteInput(e.to_string()))?;
    // write input data
    let input = ProgramInput {
        levels,
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
    // Note: Here we use `u32` to store the length of the chunk assuming that the length of the generated
    // proof file will not exceed 4GB. In case the length exceeds this limit, you would need to increase
    // the size of the length field to `u64`, not only here but also in the file reading logic, on the
    // SubmitProofBeast component.
    let len = chunk.len() as u32;
    buf.extend_from_slice(&len.to_le_bytes());
    buf.extend_from_slice(chunk);
}

pub fn save_proof(receipt: Receipt) -> Result<String, ProvingError> {
    let proving_system_id = RISC0_PROVING_SYSTEM;
    let proof = bincode::serialize(&receipt.inner).expect("Failed to serialize receipt");
    let proof_id = image_id_words_to_bytes(BEAST_1984_PROGRAM_ID);
    let public_inputs = receipt.journal.bytes.clone();

    let mut buffer = Vec::new();

    // We use the first byte of the generated file to indicate the proving system used
    buffer.extend_from_slice(&proving_system_id);

    write_chunk(&mut buffer, &proof);
    write_chunk(&mut buffer, &proof_id);
    write_chunk(&mut buffer, &public_inputs);

    let timestamp = Utc::now().format("%Y-%m-%d_%H-%M-%S").to_string();
    let filename = format!("risc0_solution_{}.bin", timestamp);

    std::fs::write(&filename, &buffer).map_err(|e| ProvingError::SavingProof(e.to_string()))?;

    Ok(filename)
}

fn image_id_words_to_bytes(image_id: [u32; 8]) -> [u8; 32] {
    let mut bytes = [0; 32];
    for i in 0..8 {
        bytes[4 * i..4 * (i + 1)].copy_from_slice(&image_id[i].to_le_bytes());
    }
    bytes
}
