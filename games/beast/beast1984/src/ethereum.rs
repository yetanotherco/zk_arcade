use std::io;
use alloy::primitives::Address;

pub fn read_address() -> String {
    loop {
        println!("Please enter your Ethereum address to start the game:");
        let mut address = String::new();

        io::stdin()
            .read_line(&mut address)
            .expect("Failed to read from stdin");
        address = address.trim().to_string();

        if !is_valid_address(&address) {
            println!(
                "Invalid Ethereum address: '{}'. Please try again.",
                address
            );
            continue;
        }
        return address;
    }
}

fn is_valid_address(address: &str) -> bool {
    match address.parse::<Address>() {
        Ok(_) => true,
        Err(_) => false
    }
}