use std::sync::LazyLock;

use alloy::hex;
use game_logic::{
    common::levels::LevelJson,
    proving::{LevelLog, ProgramInput},
};
use sp1_sdk::{EnvProver, ProverClient, SP1ProofWithPublicValues, SP1Stdin};

const BEAST_1984_PROGRAM_ELF: &[u8] = include_bytes!("../sp1_program/elf/beast_1984_program");
static SP1_PROVER_CLIENT: LazyLock<EnvProver> = LazyLock::new(ProverClient::from_env);

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
        .run()
        .map_err(|e| ProvingError::Prove(e.to_string()))?;

    client
        .verify(&proof, &vk)
        .map_err(|e| ProvingError::Verification(e.to_string()))?;

    Ok(proof)
}

pub fn save_proof(proof: SP1ProofWithPublicValues) -> Result<(), ProvingError> {
    proof
        .save("./sp1_proof.bin")
        .expect("Failed to serialize the receipt");

    std::fs::write("sp1_proof_id.bin", BEAST_1984_PROGRAM_ELF)
        .map_err(|e| ProvingError::SavingProof(e.to_string()))?;

    std::fs::write("sp1_public_inputs.bin", proof.public_values)
        .map_err(|e| ProvingError::SavingProof(e.to_string()))?;

    Ok(())
}
