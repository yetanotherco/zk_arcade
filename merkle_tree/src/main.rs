use dotenvy::{dotenv, from_filename};
use merkle_tree_rs::standard::{LeafType, StandardMerkleTree};
use serde::{Deserialize, Serialize};
use sqlx::{Postgres, postgres::PgPoolOptions};
use std::{env, fs};
use std::collections::HashSet;
use sqlx::Row;

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

async fn filter_addresses(addresses: Vec<String>) -> Result<Vec<String>, sqlx::Error> {
    if dotenv().is_err() {
        println!("Warning: No .env file found. Attempting to load .env.example");
        let _ = from_filename(".env.example");
    }

    let database_url =
        env::var("DATABASE_URL").expect("The environment variable DATABASE_URL is missing!");

    let pool = PgPoolOptions::new()
        .connect(&database_url)
        .await
        .expect("Failed to connect to the database!");
    
    let rows = sqlx::query(
        r#"
        SELECT address
        FROM merkle_paths
        WHERE lower(address) = ANY($1)
        "#,
    )
    .bind(&addresses)
    .fetch_all(&pool)
    .await?;

    let existing: HashSet<String> = rows
        .into_iter()
        .map(|r| r.get::<String, _>("address").to_lowercase())
        .collect();

    let to_insert: Vec<String> = addresses
        .into_iter()
        .filter(|a| !existing.contains(&a.to_lowercase()))
        .collect();

    println!("Already in DB: {existing:?}");
    println!("New to insert: {to_insert:?}");

    Ok(to_insert)
}

#[tokio::main]
async fn main() {
    let args = env::args().skip(1).collect::<Vec<_>>();
    if args.len() == 1 {
        let in_path = &args[0];

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

        let filtered = filter_addresses(addresses.clone()).await.expect("Failed to filter addresses");

        return;
    }

    if args.len() != 3 {
        eprintln!("Usage: merkle_json_cli <input.json> <output.json> <merkle_root_index>");
        std::process::exit(1);
    }

    let in_path = &args[0];
    let out_path = &args[1];
    let merkle_root_index: i32 = args[2].parse().unwrap_or_else(|e| {
        eprintln!("Invalid merkle_root_index: {e}");
        std::process::exit(1);
    });

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

    if dotenv().is_err() {
        println!("Warning: No .env file found. Attempting to load .env.example");
        let _ = from_filename(".env.example");
    }

    let database_url =
        env::var("DATABASE_URL").expect("The environment variable DATABASE_URL is missing!");

    let pool = PgPoolOptions::new()
        .connect(&database_url)
        .await
        .expect("Failed to connect to the database!");

    let mut query_builder =
        sqlx::QueryBuilder::<Postgres>::new("INSERT INTO merkle_paths (id, address, merkle_proof, merkle_root_index)");
    query_builder.push_values(out.proofs.iter(), |mut b, ProofEntry { address, proof }| {
        b.push_bind(uuid::Uuid::new_v4())
            .push_bind(address)
            .push_bind(proof)
            .push_bind(merkle_root_index);
    });
    let _result = query_builder.build().execute(&pool).await.unwrap();
    println!("Data successfully inserted into database!");
}
