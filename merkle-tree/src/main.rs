use merkle_tree_rs::standard::{LeafType, StandardMerkleTree};
use serde::{Deserialize, Serialize};
use std::{env, fs};

#[derive(Deserialize)]
struct WhitelistWrapper {
    whitelist: Whitelist,
}
#[derive(Deserialize)]
struct Whitelist {
    addresses: Vec<String>,
}

#[derive(Serialize)]
struct ProofEntry {
    address: String,
    proof: Vec<String>,
}
#[derive(Serialize)]
struct Output {
    root: String,
    proofs: Vec<ProofEntry>,
}

fn main() {
    let args = env::args().skip(1).collect::<Vec<_>>();
    if args.is_empty() {
        eprintln!("Usage: merkle_json_cli --in <input.json> --out <output.json>");
        std::process::exit(1);
    }

    let mut in_path: Option<String> = None;
    let mut out_path: Option<String> = None;
    let mut i = 0;
    while i < args.len() {
        match args[i].as_str() {
            "--in" if i + 1 < args.len() => {
                in_path = Some(args[i + 1].clone());
                i += 2;
            }
            "--out" if i + 1 < args.len() => {
                out_path = Some(args[i + 1].clone());
                i += 2;
            }
            other => {
                eprintln!("Unknown flag: {other}");
                eprintln!("Usage: cargo run -- --in <input.json> --out <output.json>");
                std::process::exit(1);
            }
        }
    }
    let in_path = in_path.expect("Missing --in <input.json>");
    let out_path = out_path.expect("Missing --out <output.json>");

    let data =
        fs::read_to_string(&in_path).unwrap_or_else(|e| panic!("Failed to read {in_path}: {e}"));
    let parsed: WhitelistWrapper =
        serde_json::from_str(&data).unwrap_or_else(|e| panic!("Invalid JSON: {e}"));

    let addresses = parsed.whitelist.addresses;

    let values: Vec<Vec<String>> = addresses.iter().map(|a| vec![a.clone()]).collect();

    println!("Building Merkle tree for {:?} addresses...", addresses);

    let tree = StandardMerkleTree::of(&values, &["address"]).expect("Failed to build Merkle tree");

    let root = tree.root();
    println!("Merkle root: {}", root);

    let mut proofs = Vec::new();
    for (i, addr) in addresses.iter().enumerate() {
        let proof = tree
            .get_proof(LeafType::Number(i))
            .expect("Failed to get proof");

        proofs.push(ProofEntry {
            address: addr.clone(),
            proof,
        });
    }

    let out = Output { root, proofs };
    let serialized = serde_json::to_string_pretty(&out).expect("Failed to serialize output JSON");

    fs::write(&out_path, &serialized).unwrap_or_else(|e| panic!("Failed to write {out_path}: {e}"));
    println!("Merkle proof data written to merkle-tree/{}", out_path);
}
