use risc0_build::GuestOptionsBuilder;
use std::collections::HashMap;

// Reference: https://docs.succinct.xyz/docs/sp1/writing-programs/compiling#advanced-build-options-1
fn main() {
    let guest_options = GuestOptionsBuilder::default().build().unwrap();
    risc0_build::embed_methods_with_options(HashMap::from([("beast_1984_program", guest_options)]));
}
