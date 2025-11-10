use csv;
use dotenvy::{dotenv, from_filename};
use merkle_tree_rs::standard::{LeafType, StandardMerkleTree};
use serde::Serialize;
use sqlx::{Postgres, postgres::PgPoolOptions};
use std::{env, fs};

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

fn read_addresses_from_file(path: &str) -> Vec<String> {
    let data = fs::read_to_string(path).unwrap_or_else(|e| panic!("Failed to read {path}: {e}"));

    let mut csv_reader = csv::Reader::from_reader(data.as_bytes());
    let mut addresses = Vec::new();
    for result in csv_reader.records() {
        let record = result.expect("Failed to read CSV record");
        if let Some(address) = record.get(0) {
            addresses.push(address.to_string());
        }
    }
    return addresses;
}

fn write_whitelist_to_file(addresses: Vec<String>, path: &str) {
    let mut wtr = csv::Writer::from_path(path).unwrap();
    wtr.write_record(&["address"]).unwrap();
    for address in addresses {
        wtr.write_record(&[address]).unwrap();
    }
    wtr.flush().unwrap();
}

// Builds the Merkle tree and generates proofs for each address, returning the root and proofs
fn build_tree_and_proofs(addresses: &[String]) -> Output {
    if addresses.is_empty() {
        panic!("No addresses provided for Merkle tree");
    }

    let values: Vec<Vec<String>> = addresses.iter().map(|a| vec![a.clone()]).collect();

    println!("Building Merkle tree for {} addresses...", addresses.len());

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

    Output { root, proofs }
}

async fn setup_database_connection() -> sqlx::Pool<Postgres> {
    if dotenv().is_err() {
        println!("Warning: No .env file found. Attempting to load .env.example");
        let _ = from_filename("merkle_tree/.env.example");
    }

    let database_url =
        env::var("DATABASE_URL").expect("The environment variable DATABASE_URL is missing!");

    PgPoolOptions::new()
        .connect(&database_url)
        .await
        .expect("Failed to connect to database")
}

// Inserts Merkle proofs into the database
async fn insert_merkle_proofs(
    pool: &sqlx::Pool<Postgres>,
    merkle_proofs: &Vec<ProofEntry>,
    merkle_root_index: i32,
    is_public_nft: bool,
) {
    let table_name = if is_public_nft {
        "merkle_paths_public"
    } else {
        "merkle_paths"
    };

    let mut query_builder = sqlx::QueryBuilder::<Postgres>::new(&format!(
        "INSERT INTO {} (id, address, merkle_proof, merkle_root_index)",
        table_name
    ));
    query_builder.push_values(
        merkle_proofs.iter(),
        |mut b, ProofEntry { address, proof }| {
            b.push_bind(uuid::Uuid::new_v4())
                .push_bind(address)
                .push_bind(proof)
                .push_bind(merkle_root_index);
        },
    );
    let _result = query_builder
        .build()
        .execute(pool)
        .await
        .expect("Failed to insert data into database");
    println!("Data successfully inserted into database!");
}

// Generates Merkle tree, writes proofs to file, and inserts data into the database. Also writes the filtered addresses to a separate file.
async fn handle_merkle_processing(
    addresses: Vec<String>,
    output_path: &str,
    merkle_root_index: i32,
    inserted_directory: &str,
    is_public_nft: bool,
) {
    let output = build_tree_and_proofs(&addresses);

    // Insert the merkle proofs into the database
    println!("Connecting to database...");
    let pool = setup_database_connection().await;
    insert_merkle_proofs(&pool, &output.proofs, merkle_root_index, is_public_nft).await;

    // Write the output to a JSON file
    let serialized = serde_json::to_string_pretty(&output).expect("Failed to serialize output");
    fs::write(output_path, &serialized)
        .unwrap_or_else(|e| panic!("Failed to write {}: {}", output_path, e));
    println!("Merkle proof data written to {}", output_path);

    let inserted_path = format!("{}/inserted_{}.csv", inserted_directory, merkle_root_index);
    write_whitelist_to_file(addresses, &inserted_path);
}

#[tokio::main]
async fn main() {
    let args: Vec<String> = env::args().skip(1).collect();

    if args.len() == 4 {
        let input_path = &args[0];
        let output_path = &args[1];
        let merkle_root_index: i32 = args[2].parse().unwrap_or_else(|e| {
            eprintln!("Invalid merkle_root_index: {}", e);
            std::process::exit(1);
        });
        let inserted_directory = &args[3];
        let is_public_nft = input_path.contains("discount");

        let addresses: Vec<String> = read_addresses_from_file(input_path)
            .into_iter()
            .map(|a| a.to_lowercase().trim().to_string())
            .collect();

        if addresses.is_empty() {
            eprintln!("No new addresses found for whitelisting.");
            std::process::exit(1);
        }

        handle_merkle_processing(
            addresses,
            output_path,
            merkle_root_index,
            inserted_directory,
            is_public_nft,
        )
        .await;
    } else {
        eprintln!(
            "Usage: merkle_json_cli <input.csv> <output.json> <merkle_root_index> <inserted_directory>"
        );
        std::process::exit(1);
    }
}
