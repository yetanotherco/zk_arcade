use std::str::FromStr;

use alloy::{
    network::EthereumWallet,
    primitives::{Address, Bytes, U256},
    providers::ProviderBuilder,
    signers::local::LocalSigner,
    sol,
};

sol!(
    #[sol(rpc)]
    Leaderboard,
    "cmd/abi/Leaderboard.json"
);

use aligned_sdk::{
    common::types::{AlignedVerificationData, Network, Signer, VerificationData, Wallet},
    verification_layer::estimate_fee,
};

pub struct AlignedClient {
    chain_id: u64,
    eth_rpc_url: String,
    network: Network,
    wallet_key_path: String,
    wallet_password: String,
}

impl AlignedClient {
    pub async fn send_proof_to_be_verified_on_aligned(
        &self,
        proof: Vec<u8>,
        image_id: Vec<u8>,
        pub_input: Vec<u8>,
    ) -> AlignedVerificationData {
        let wallet = Wallet::decrypt_keystore(&self.wallet_key_path, &self.wallet_password)
            .expect("Keystore to be `cast wallet` compliant")
            .with_chain_id(self.chain_id);

        let verification_data = VerificationData {
            proof_generator_addr: wallet.address(),
            proving_system: aligned_sdk::common::types::ProvingSystemId::Risc0,
            proof,
            vm_program_code: Some(image_id),
            pub_input: Some(pub_input),
            verification_key: None,
        };

        let nonce = aligned_sdk::verification_layer::get_nonce_from_batcher(
            self.network.clone(),
            wallet.address(),
        )
        .await
        .expect("Retrieve nonce from aligned batcher");

        let max_fee = estimate_fee(
            &self.eth_rpc_url,
            aligned_sdk::common::types::FeeEstimationType::Instant,
        )
        .await
        .expect("Max fee to be retrieved");

        aligned_sdk::verification_layer::submit_and_wait_verification(
            &self.eth_rpc_url,
            self.network.clone(),
            &verification_data,
            max_fee,
            wallet,
            nonce,
        )
        .await
        .expect("Proof to be sent")
    }
}

#[tokio::main]
async fn main() {
    let eth_rpc_url = "https://ethereum-holesky-rpc.publicnode.com/".to_string();
    let wallet_key_path = "sender".to_string();
    let wallet_password = "".to_string();

    let aligned_client = AlignedClient {
        chain_id: 17000,
        eth_rpc_url: eth_rpc_url.clone(),
        network: Network::HoleskyStage,
        wallet_key_path: wallet_key_path.clone(),
        wallet_password: wallet_password.clone(),
    };
    let proof = std::fs::read("./beast1984/proof.bin").expect("proof to exist");
    let image_id = std::fs::read("./beast1984/proof_id.bin").expect("image id file to exist");
    let pub_input =
        std::fs::read("./beast1984/public_inputs.bin").expect("public inputs file to exist");

    let aligned_verification_data = aligned_client
        .send_proof_to_be_verified_on_aligned(proof, image_id, pub_input.clone())
        .await;

    let rpc_url = eth_rpc_url.parse().expect("RPC URL should be valid");
    let signer = LocalSigner::decrypt_keystore(wallet_key_path, wallet_password)
        .expect("Keystore signer should be `cast wallet` compliant");
    let wallet = EthereumWallet::from(signer);
    let rpc_provider = ProviderBuilder::new().wallet(wallet).connect_http(rpc_url);
    let leaderboard = Leaderboard::new(
        Address::from_str("0xA2F6042A7f33214D30319202AF5E6f2b257F5F61")
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

    res.get_receipt().await.expect("to get transaction receipt");
}
