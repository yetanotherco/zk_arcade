use std::{env, str::FromStr};

use aligned_sdk::common::types::{AlignedVerificationData, Network};
use alloy::{
    hex,
    network::{EthereumWallet, ReceiptResponse},
    primitives::{Address, Bytes, U256},
    providers::ProviderBuilder,
    signers::local::LocalSigner,
    sol,
};
use beast1984::aligned_client::AlignedClient;
use tracing::info;
use tracing_subscriber::FmtSubscriber;

sol!(
    #[sol(rpc)]
    Leaderboard,
    "cmd/abi/Leaderboard.json"
);

const PROOF_FILE_PATH: &str = "./beast1984/proof.bin";
const PUBLIC_INPUTS_FILE_PATH: &str = "./beast1984/public_inputs.bin";
const PROGRAM_ID_FILE_PATH: &str = "./beast1984/proof_id.bin";

async fn send_solution_to_leaderboard(
    aligned_verification_data: AlignedVerificationData,
    pub_input: Vec<u8>,
    eth_rpc_url: String,
    wallet_private_key: String,
    leaderboard_contract_address: String,
) -> [u8; 32] {
    let rpc_url = eth_rpc_url.parse().expect("RPC URL should be valid");
    let signer = LocalSigner::from_str(&wallet_private_key).expect("Valid private key");
    let wallet = EthereumWallet::new(signer);
    let rpc_provider = ProviderBuilder::new().wallet(wallet).connect_http(rpc_url);
    let leaderboard = Leaderboard::new(
        Address::from_str(&leaderboard_contract_address)
            .expect("Leaderboard address should be valid"),
        rpc_provider,
    );

    let merkle_path = Bytes::from(
        aligned_verification_data
            .batch_inclusion_proof
            .merkle_path
            .as_slice()
            .iter()
            .flatten()
            .copied()
            .collect::<Vec<u8>>(),
    );

    println!("Submitting solution");
    let res = leaderboard
        .submitBeastSolution(
            aligned_verification_data
                .verification_data_commitment
                .proof_commitment
                .into(),
            pub_input.into(),
            aligned_verification_data
                .verification_data_commitment
                .proving_system_aux_data_commitment
                .into(),
            aligned_verification_data
                .verification_data_commitment
                .proof_generator_addr
                .into(),
            aligned_verification_data.batch_merkle_root.into(),
            merkle_path.into(),
            U256::from(aligned_verification_data.index_in_batch),
        )
        .send()
        .await
        .expect("To be able to send the transaction");

    res.get_receipt()
        .await
        .expect("to get transaction receipt")
        .transaction_hash()
        .0
}

#[tokio::main]
async fn main() {
    let subscriber = FmtSubscriber::builder().finish();
    tracing::subscriber::set_global_default(subscriber).expect("setting default subscriber failed");

    info!("Reading config...");
    let chain_id: u64 = env::var("CHAIN_ID")
        .ok()
        .map(|s| s.parse().expect("CHAIN_ID must be a valid u64"))
        .expect("CHAIN_ID must b e set");
    let eth_rpc_url = env::var("ETH_RPC_URL").expect("ETH_RPC_URL must be set");
    let network = env::var("NETWORK").expect("NETWORK must be set");
    let wallet_private_key =
        env::var("WALLET_PRIVATE_KEY").expect("WALLET_PRIVATE_KEY must be set");
    let leaderboard_contract_address =
        env::var("LEADERBOARD_CONTRACT_ADDRESS").expect("LEADERBOARD_CONTRACT_ADDRESS must be set");
    let network = match network.as_str() {
        "mainnet" => Network::Mainnet,
        "holesky" => Network::Holesky,
        "holesky-stage" => Network::HoleskyStage,
        "devnet" => Network::Devnet,
        _ => panic!("Invalid NETWORK, possible values: mainnet|holeksy|holesky-stage|devnet"),
    };

    let aligned_client = AlignedClient::new(
        chain_id.clone(),
        eth_rpc_url.clone(),
        network,
        wallet_private_key.clone(),
    );

    info!("Config correct, reading proof...");

    let proof = std::fs::read(PROOF_FILE_PATH).expect("proof to exist");
    let image_id = std::fs::read(PROGRAM_ID_FILE_PATH).expect("image id file to exist");
    let pub_input = std::fs::read(PUBLIC_INPUTS_FILE_PATH).expect("public inputs file to exist");

    info!("Proof loaded, sending to verify on aligned...");
    let aligned_verification_data = aligned_client
        .send_proof_to_be_verified_on_aligned(proof, image_id, pub_input.clone())
        .await;

    info!("Proof verified on aligned, sending submission to contract...");
    let tx_hash = send_solution_to_leaderboard(
        aligned_verification_data,
        pub_input,
        eth_rpc_url,
        wallet_private_key,
        leaderboard_contract_address,
    )
    .await;
    info!("Solution sent, tx hash: {:?}", hex::encode(tx_hash));
}
