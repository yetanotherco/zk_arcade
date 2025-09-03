use ethers_core::{types::Address, utils::keccak256};
use serde::{Deserialize, Serialize};
use std::{env, fs, str::FromStr};

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

fn leaf_hash(addr: Address) -> [u8; 32] {
    keccak256(addr.as_bytes())
}

fn sort_bytes32_vec(mut v: Vec<[u8; 32]>) -> Vec<[u8; 32]> {
    v.sort();
    v
}

fn hash_pair(a: [u8; 32], b: [u8; 32]) -> [u8; 32] {
    let (left, right) = if a <= b { (a, b) } else { (b, a) };
    let mut buf = [0u8; 64];
    buf[..32].copy_from_slice(&left);
    buf[32..].copy_from_slice(&right);
    keccak256(buf)
}

fn build_merkle_tree(mut leaves: Vec<[u8; 32]>) -> [u8; 32] {
    assert!(!leaves.is_empty(), "Empty whitelist");
    let mut n = leaves.len();
    while n > 1 {
        let mut k = 0usize;
        for i in (0..n).step_by(2) {
            let left = leaves[i];
            let right = if i + 1 < n { leaves[i + 1] } else { left };
            leaves[k] = hash_pair(left, right);
            k += 1;
        }
        n = k;
    }
    leaves[0]
}

fn generate_proof(sorted_leaves: &[[u8; 32]], leaf: [u8; 32]) -> Vec<[u8; 32]> {
    let n = sorted_leaves.len();
    assert!(n > 0, "Empty tree");

    // leaf index
    let mut index = None;
    for (i, h) in sorted_leaves.iter().enumerate() {
        if *h == leaf {
            index = Some(i);
            break;
        }
    }
    let mut current_index = index.expect("Leaf not found");
    let mut current_level = sorted_leaves.to_vec();
    let mut current_n = n;

    let mut temp_n = n;
    let mut proof_len = 0usize;
    while temp_n > 1 {
        proof_len += 1;
        temp_n = (temp_n + 1) / 2;
    }

    let mut proof = Vec::with_capacity(proof_len);

    while current_n > 1 {
        let sibling_index = if current_index % 2 == 0 {
            current_index + 1
        } else {
            current_index - 1
        };

        // if no sibling, duplicate own
        let sibling = if sibling_index < current_n {
            current_level[sibling_index]
        } else {
            current_level[current_index]
        };
        proof.push(sibling);

        // build next level
        let mut next_level = Vec::with_capacity((current_n + 1) / 2);
        for i in (0..current_n).step_by(2) {
            let left = current_level[i];
            let right = if i + 1 < current_n {
                current_level[i + 1]
            } else {
                left
            };
            next_level.push(hash_pair(left, right));
        }

        current_level = next_level;
        current_index /= 2;
        current_n = (current_n + 1) / 2;
    }

    proof
}

fn parse_addresses_hex(addrs: &[String]) -> Result<Vec<Address>, String> {
    addrs
        .iter()
        .map(|s| Address::from_str(s).map_err(|e| format!("Invalid address '{}': {e}", s)))
        .collect()
}

fn hex32(b: [u8; 32]) -> String {
    format!("0x{}", hex::encode(b))
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
                eprintln!("Unknown flag or unexpected parameter: {}", other);
                eprintln!("Usage: cargo run -- --in <input.json> --out <output.json>");
                std::process::exit(1);
            }
        }
    }
    let in_path = in_path.expect("Missing --in <input.json>");
    let out_path = out_path.expect("Missing --out <output.json>");

    let data = fs::read_to_string(&in_path)
        .unwrap_or_else(|e| panic!("Failed to read {}: {}", in_path, e));
    let parsed: WhitelistWrapper =
        serde_json::from_str(&data).unwrap_or_else(|e| panic!("Invalid JSON: {}", e));

    let addresses =
        parse_addresses_hex(&parsed.whitelist.addresses).unwrap_or_else(|e| panic!("{e}"));
    assert!(!addresses.is_empty(), "Empty whitelist");

    let leaves_sorted = sort_bytes32_vec(addresses.iter().map(|&a| leaf_hash(a)).collect());
    let root = build_merkle_tree(leaves_sorted.clone());

    let mut proofs = Vec::<ProofEntry>::new();
    for addr in &addresses {
        let leaf = leaf_hash(*addr);
        let proof = generate_proof(&leaves_sorted, leaf)
            .into_iter()
            .map(hex32)
            .collect::<Vec<_>>();
        proofs.push(ProofEntry {
            address: format!("{addr:#x}"),
            proof,
        });
    }

    let out = Output {
        root: hex32(root),
        proofs,
    };
    let serialized = serde_json::to_string_pretty(&out).expect("Failed to serialize output JSON");

    fs::write(&out_path, &serialized)
        .unwrap_or_else(|e| panic!("Failed to write {}: {}", out_path, e));
    println!("Merkle proof data written to merkle_tree/{}", out_path);
}
