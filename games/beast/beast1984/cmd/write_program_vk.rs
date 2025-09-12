use aligned_sdk::common::types::ProvingSystemId;
use alloy::{hex::hex, primitives::Keccak256};
use serde_json::json;
use std::{fs, path::Path};
use tracing::info;
use tracing_subscriber::FmtSubscriber;

const ELF: &[u8] = include_bytes!("../sp1_program/elf/beast_1984_program");

fn main() {
    let subscriber = FmtSubscriber::builder().finish();
    tracing::subscriber::set_global_default(subscriber).expect("setting default subscriber failed");

    info!("About to write programs vk commitment");

    let mut hasher = Keccak256::new();
    hasher.update(ELF);
    hasher.update([ProvingSystemId::SP1 as u8]);
    let vk_commitment_bytes = hasher.finalize().0;

    let dest_path = Path::new("program_vk_commitment.json");
    let json_data = json!({
        "program_vk_commitment": format!("0x{}", hex::encode(vk_commitment_bytes)),
    });
    fs::write(dest_path, serde_json::to_string_pretty(&json_data).unwrap()).unwrap();

    info!("Program vk commitment written to {:?}", dest_path);
}
