use risc0_build::GuestOptionsBuilder;
use std::collections::HashMap;

fn main() {
    let guest_options = GuestOptionsBuilder::default().build().unwrap();
    risc0_build::embed_methods_with_options(HashMap::from([("beast_1984_program", guest_options)]));
}
