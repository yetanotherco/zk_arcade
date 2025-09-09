use dotenvy::{dotenv, from_filename};
use merkle_tree_rs::standard::{LeafType, StandardMerkleTree};
use serde::{Deserialize, Serialize};
use sqlx::{Postgres, postgres::PgPoolOptions};
use std::{env, fs};
use std::collections::HashSet;

const FILTERED_DIR_PATH: &str = "whitelisted_addresses/";
const FILTERED_FILE: &str = "filtered.json";
const REPEATED_FILE: &str = "repeated.json";

#[derive(Serialize, Deserialize)]
struct WhitelistWrapper {
    whitelist: Whitelist,
}

#[derive(Serialize, Deserialize)]
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

fn read_addresses_from_file(path: &str) -> Vec<String> {
    let data = fs::read_to_string(path).unwrap_or_else(|e| panic!("Failed to read {path}: {e}"));
    let parsed: WhitelistWrapper =
        serde_json::from_str(&data).unwrap_or_else(|e| panic!("Invalid JSON: {e}"));
    parsed.whitelist.addresses
}

fn write_whitelist_to_file(addresses: Vec<String>, path: &str) {
    let wrapper = WhitelistWrapper {
        whitelist: Whitelist { addresses },
    };
    
    let serialized = serde_json::to_string_pretty(&wrapper).expect("Failed to serialize");
    fs::write(path, &serialized).unwrap_or_else(|e| panic!("Failed to write {}: {}", path, e));
}

fn read_previous_filtered_addresses() -> HashSet<String> {
    let paths = fs::read_dir(FILTERED_DIR_PATH).unwrap_or_else(|e| panic!("Failed to read directory {}: {}", FILTERED_DIR_PATH, e));

    let mut existing: HashSet<String> = HashSet::new();
    for path in paths {
        let path = path.unwrap().path();
        if path.is_file() {
            if let Some(file_name) = path.file_name() {
                if let Some(file_name_str) = file_name.to_str() {
                    if file_name_str.starts_with("filtered_") && file_name_str.ends_with(".json") {
                        let file_addresses: Vec<String> = read_addresses_from_file(path.to_str().unwrap());
                        for addr in file_addresses {
                            existing.insert(addr.to_lowercase());
                        }
                    }
                }
            }
        }
    }

    existing
}

// Filters new addresses against previously filtered ones and writes the filtered and deleted ones to separate files
fn filter_addresses(addresses: Vec<String>) {
    let previous_filtered_addresses = read_previous_filtered_addresses();

    let new_addresses: HashSet<String> = addresses.into_iter().collect();

    let filtered: Vec<String> = new_addresses.difference(&previous_filtered_addresses).cloned().collect();
    let intersection: Vec<String> = new_addresses.intersection(&previous_filtered_addresses).cloned().collect();

    write_whitelist_to_file(filtered, FILTERED_FILE);
    println!("Filtered addresses written to {}", FILTERED_FILE);

    write_whitelist_to_file(intersection, REPEATED_FILE);
    println!("Repeated addresses written to {}", REPEATED_FILE);
}

// Builds the Merkle tree and generates proofs for each address, returning the root and proofs
fn build_tree_and_proofs(addresses: &[String]) -> Output {
    if addresses.is_empty() {
        panic!("No addresses provided for Merkle tree");
    }

    let values: Vec<Vec<String>> = addresses
        .iter()
        .map(|a| vec![a.clone()])
        .collect();

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
        let _ = from_filename(".env.example");
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
    output: &Output,
    merkle_root_index: i32,
) {
    let mut query_builder =
        sqlx::QueryBuilder::<Postgres>::new("INSERT INTO merkle_paths (id, address, merkle_proof, merkle_root_index)");
    query_builder.push_values(output.proofs.iter(), |mut b, ProofEntry { address, proof }| {
        b.push_bind(uuid::Uuid::new_v4())
            .push_bind(address)
            .push_bind(proof)
            .push_bind(merkle_root_index);
    });
    let _result = query_builder.build().execute(pool).await.expect("Failed to insert data into database");
    println!("Data successfully inserted into database!");
}

// Generates Merkle tree, writes proofs to file, and inserts data into the database. Also writes the filtered addresses to a separate file.
async fn handle_merkle_processing(
    addresses: Vec<String>,
    output_path: &str,
    merkle_root_index: i32,
) {
    let output = build_tree_and_proofs(&addresses);
    
    let serialized = serde_json::to_string_pretty(&output).expect("Failed to serialize output");
    fs::write(output_path, &serialized).unwrap_or_else(|e| panic!("Failed to write {}: {}", output_path, e));
    println!("Merkle proof data written to merkle_tree/{}", output_path);

    let filtered_path = format!("whitelisted_addresses/filtered_{}.json", merkle_root_index);
    write_whitelist_to_file(addresses, &filtered_path);

    println!("Connecting to database...");
    let pool = setup_database_connection().await;
    insert_merkle_proofs(&pool, &output, merkle_root_index).await;
}

fn load_and_normalize_addresses(path: &str) -> Vec<String> {
    let addresses = read_addresses_from_file(path);
    addresses
        .into_iter()
        .map(|a| a.to_lowercase().trim().to_string())
        .collect()
}

#[tokio::main]
async fn main() {
    let args: Vec<String> = env::args().skip(1).collect();
    
    if args.len() == 1 {
        let input_path = &args[0];

        let addresses = load_and_normalize_addresses(input_path);

        filter_addresses(addresses);
    } else if args.len() == 3 {
        let input_path = &args[0];
        let output_path = &args[1];
        let merkle_root_index: i32 = args[2].parse().unwrap_or_else(|e| {
            eprintln!("Invalid merkle_root_index: {}", e);
            std::process::exit(1);
        });
        
        let addresses = load_and_normalize_addresses(input_path);
        if addresses.is_empty() {
            eprintln!("No new addresses found for whitelisting.");
            std::process::exit(1);
        }

        handle_merkle_processing(addresses, output_path, merkle_root_index).await;
    } else {
        eprintln!("Usage: merkle_json_cli <input.json> [<output.json> <merkle_root_index>]");
        std::process::exit(1);
    }
}
