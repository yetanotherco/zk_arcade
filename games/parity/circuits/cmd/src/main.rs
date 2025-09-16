use std::{fs, path::Path};

use aligned_sdk::common::types::ProvingSystemId;
use alloy::{hex, primitives::Keccak256};
use serde_json::json;

fn main() {
    let vk_bytes = std::fs::read("../public/artifacts/verification_key.json")
        .expect("verification key to be created");

    let mut hasher = Keccak256::new();
    hasher.update(vk_bytes);
    hasher.update([ProvingSystemId::CircomGroth16Bn256 as u8]);
    let vk_commitment_bytes = hasher.finalize().0;

    let dest_path = Path::new("program_vk_commitment.json");
    let json_data = json!({
        "program_vk_commitment": format!("0x{}", hex::encode(vk_commitment_bytes)),
    });
    fs::write(dest_path, serde_json::to_string_pretty(&json_data).unwrap()).unwrap();

    println!("Program vk commitment written to {:?}", dest_path);
}
