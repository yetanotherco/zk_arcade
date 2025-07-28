fn main() {
    sp1_build::build_program_with_args("./zkvm_program/", {
        sp1_build::BuildArgs {
            output_directory: Some("./zkvm_program/elf".to_string()),
            binaries: vec!["beast_1984_program".into()],
            ..Default::default()
        }
    });
}
