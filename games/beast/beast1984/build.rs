use risc0_build::GuestOptionsBuilder;
use std::collections::HashMap;

// Reference: https://docs.succinct.xyz/docs/sp1/writing-programs/compiling#advanced-build-options-1
fn main() {
    let guest_options = GuestOptionsBuilder::default().build().unwrap();
    risc0_build::embed_methods_with_options(HashMap::from([("beast_1984_risc0_program", guest_options)]));

    sp1_build::build_program_with_args("./sp1_program/", {
        sp1_build::BuildArgs {
            output_directory: Some("./sp1_program/elf".to_string()),
            binaries: vec!["beast_1984_program".into()],
            ..Default::default()
        }
    });
}
