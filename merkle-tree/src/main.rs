use merkle_tree_rs::standard::{LeafType, StandardMerkleTree};
use serde::{Deserialize, Serialize};
use sqlx::{Postgres, postgres::PgPoolOptions};
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

#[tokio::main]
async fn main() {
    let args = env::args().skip(1).collect::<Vec<_>>();
    if args.len() != 2 {
        eprintln!("Usage: merkle_json_cli <input.json> <output.json>");
        std::process::exit(1);
    }

    let in_path = &args[0];
    let out_path = &args[1];

    println!("Processing input file: {}", in_path);
    let data =
        fs::read_to_string(in_path).unwrap_or_else(|e| panic!("Failed to read {in_path}: {e}"));
    let parsed: WhitelistWrapper =
        serde_json::from_str(&data).unwrap_or_else(|e| panic!("Invalid JSON: {e}"));

    let addresses = parsed
        .whitelist
        .addresses
        .into_iter()
        .map(|a| a.to_lowercase().trim().to_string())
        .collect::<Vec<_>>();

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

    fs::write(out_path, &serialized).unwrap_or_else(|e| panic!("Failed to write {out_path}: {e}"));
    println!("Merkle proof data written to merkle-tree/{}", out_path);

    println!("Connecting to database...");
    let pool = PgPoolOptions::new()
        .connect("postgresql://postgres:postgres@127.0.0.1:5433/zk_arcade_dev")
        .await
        .expect("Failed to connect to the database!");

    let mut query_builder =
        sqlx::QueryBuilder::<Postgres>::new("INSERT INTO merkle_paths (id, address, merkle_proof)");
    query_builder.push_values(out.proofs.iter(), |mut b, ProofEntry { address, proof }| {
        b.push_bind(uuid::Uuid::new_v4())
            .push_bind(address)
            .push_bind(proof);
    });
    let _result = query_builder.build().execute(&pool).await.unwrap();
    println!("Data successfully inserted into database!");
}
