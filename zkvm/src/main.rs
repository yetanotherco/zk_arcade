include!(concat!(env!("OUT_DIR"), "/methods.rs"));

use risc0_zkvm::{default_prover, ExecutorEnv, ProverOpts};

pub fn main() {
    let mut env_builder = ExecutorEnv::builder();
    let env = env_builder.build().unwrap();
    let prover = default_prover();

    let receipt = prover
        .prove_with_opts(env, BEAST_1984_ELF, &ProverOpts::groth16())
        .expect("proving to succeed")
        .receipt;

    receipt
        .verify(BEAST_1984_ID)
        .expect("verification to succeed");
}
