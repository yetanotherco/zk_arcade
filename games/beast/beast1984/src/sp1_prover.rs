use aligned_sdk::common::types::ProvingSystemId;
use alloy::hex;
use chrono::Utc;
use game_logic::{
    common::levels::LevelJson,
    proving::{LevelLog, ProgramInput},
};
use sp1_sdk::{EnvProver, ProverClient, SP1ProofWithPublicValues, SP1Stdin};
use std::sync::LazyLock;

const BEAST_1984_PROGRAM_ELF: &[u8] = include_bytes!("../sp1_program/elf/beast_1984_program");
static SP1_PROVER_CLIENT: LazyLock<EnvProver> = LazyLock::new(ProverClient::from_env);

const SP1_PROVING_SYSTEM: [u8; 1] = [ProvingSystemId::SP1 as u8];

#[derive(Debug, Clone)]
pub enum ProvingError {
    WriteInput(String),
    BuildExecutor(String),
    Prove(String),
    Verification(String),
    SavingProof(String),
}

pub fn prove(
    levels_log: Vec<LevelLog>,
    levels: Vec<LevelJson>,
    address: String,
) -> Result<SP1ProofWithPublicValues, ProvingError> {
    let mut stdin = SP1Stdin::new();

    let address_bytes =
        hex::decode(address).map_err(|e| ProvingError::WriteInput(e.to_string()))?;
    // write input data
    let input = ProgramInput {
        levels,
        levels_log,
        address: address_bytes,
    };
    stdin.write(&input);

    let client = &*SP1_PROVER_CLIENT;
    let (pk, vk) = client.setup(BEAST_1984_PROGRAM_ELF);
    let proof = client
        .prove(&pk, &stdin)
        .compressed()
        .run()
        .map_err(|e| ProvingError::Prove(e.to_string()))?;

    client
        .verify(&proof, &vk)
        .map_err(|e| ProvingError::Verification(e.to_string()))?;

    Ok(proof)
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

pub fn save_proof(proof: SP1ProofWithPublicValues) -> Result<String, ProvingError> {
    let proving_system_id = SP1_PROVING_SYSTEM;
    let proof_data = bincode::serialize(&proof).expect("Failed to serialize the proof");
    let proof_id = BEAST_1984_PROGRAM_ELF.to_vec();
    let public_inputs = proof.public_values.to_vec();

    let mut buffer = Vec::new();

    buffer.extend_from_slice(&proving_system_id);

    write_chunk(&mut buffer, &proof_data);
    write_chunk(&mut buffer, &proof_id);
    write_chunk(&mut buffer, &public_inputs);

    let timestamp = Utc::now().format("%Y-%m-%d_%H-%M-%S").to_string();
    let filename = format!("sp1_solution_{}.bin", timestamp);

    std::fs::write(&filename, buffer).map_err(|e| ProvingError::SavingProof(e.to_string()))?;

    Ok(filename)
}
