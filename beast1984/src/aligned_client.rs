use std::str::FromStr;

use aligned_sdk::{
    common::types::{
        AlignedVerificationData, Network, Signer, SigningKey, VerificationData, Wallet,
    },
    verification_layer::estimate_fee,
};

pub struct AlignedClient {
    eth_rpc_url: String,
    network: Network,
    wallet: Wallet<SigningKey>,
}

impl AlignedClient {
    pub fn new(
        chain_id: u64,
        eth_rpc_url: String,
        network: Network,
        wallet_private_key: String,
    ) -> Self {
        let wallet = Wallet::from_str(&wallet_private_key)
            .expect("A valid private key")
            .with_chain_id(chain_id);

        Self {
            eth_rpc_url,
            network,
            wallet,
        }
    }

    pub async fn send_proof_to_be_verified_on_aligned(
        &self,
        proof: Vec<u8>,
        image_id: Vec<u8>,
        pub_input: Vec<u8>,
    ) -> AlignedVerificationData {
        let verification_data = VerificationData {
            proof_generator_addr: self.wallet.address(),
            proving_system: aligned_sdk::common::types::ProvingSystemId::Risc0,
            proof,
            vm_program_code: Some(image_id),
            pub_input: Some(pub_input),
            verification_key: None,
        };

        let nonce = aligned_sdk::verification_layer::get_nonce_from_batcher(
            self.network.clone(),
            self.wallet.address(),
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
            self.wallet.clone(),
            nonce,
        )
        .await
        .expect("Proof to be sent")
    }
}
