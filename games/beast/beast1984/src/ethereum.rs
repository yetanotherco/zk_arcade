use alloy::primitives::Address;
use std::io;

pub fn read_address() -> String {
    loop {
        println!("Please enter your Ethereum address to start the game:");
        let mut address = String::new();

        io::stdin()
            .read_line(&mut address)
            .expect("Failed to read from stdin");
        address = address.trim().to_string();

        if !is_valid_address(&address) {
            println!("Invalid Ethereum address: '{}'. Please try again.", address);
            continue;
        }
        return address;
    }
}

fn is_valid_address(address: &str) -> bool {
    match address.parse::<Address>() {
        Ok(_) => true,
        Err(_) => false,
    }
}

fn match_network_rpc_url() -> Option<&'static str> {
    #[cfg(feature = "devnet")]
    return Some("http://localhost:8545");

    #[cfg(feature = "holesky-stage")]
    return Some("https://ethereum-holesky-rpc.publicnode.com");

    #[cfg(feature = "holesky")]
    return Some("https://ethereum-holesky-rpc.publicnode.com");

    #[cfg(feature = "mainnet")]
    return Some("https://ethereum-rpc.publicnode.com");

    None
}

pub fn get_current_block_number() -> Result<u64, String> {
    let rpc_url = match_network_rpc_url().ok_or("No network feature enabled")?;

    let body = serde_json::json!({
        "jsonrpc": "2.0",
        "method": "eth_blockNumber",
        "params": [],
        "id": 1
    })
    .to_string();

    let response = ureq::post(rpc_url)
        .set("Content-Type", "application/json")
        .send_string(&body)
        .map_err(|e| format!("Request failed: {}", e))?;

    let json: serde_json::Value =
        serde_json::from_str(&response.into_string().map_err(|e| e.to_string())?)
            .map_err(|e| format!("Invalid JSON response: {}", e))?;

    let hex_result = json
        .get("result")
        .and_then(|r| r.as_str())
        .ok_or("Missing 'result' field in JSON")?;

    u64::from_str_radix(hex_result.trim_start_matches("0x"), 16)
        .map_err(|e| format!("Invalid hex value for block number: {}", e))
}
