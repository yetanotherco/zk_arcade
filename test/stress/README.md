# ZK Arcade - Stress Testing Suite

This directory contains a set of tools used to perform stress testing on the ZK Arcade backend, which also tests Aligned. The test consists of generating parity proofs for each address and then sending them to the backend via HTTP POST requests.

## Description

The stress test simulates a multi-user load by sending proofs to the backend concurrently. This allows us to validate the system’s scalability and how it reacts under heavy load scenarios.

## Test Architecture

### Main files

#### 1. `src/stress_test.js`

Contains the main logic for each user, which consists of:

  1. Obtaining the CSRF token and establishing the session  
  2. Signing the service agreement by sending a POST request to the backend  
  3. Making a deposit in Aligned if the testing chain is not the Sepolia network  
  4. Validating the agreement status (this check also keeps the address stored in the backend session)  
  5. Generating the Circom proof (a computationally heavy task)  
  6. Sending the proof to the system  

#### 2. `src/circom_proof_generator.js`

Generates the verification data to be sent to the batcher, using Circom and the `snark.js` library to generate the inner proof from the solution.

#### 3. `src/aligned.js`

Handles deposits to the Aligned batcher payment service contract.

#### 4. `src/utils/sign_agreement.js`

Contains the logic to sign the service agreement and send it to the ZK Arcade backend.

#### 5. Other utility files

- **`src/utils/cookie_utils.js`**: Manages cookies between HTTP calls to preserve each session’s data.  
- **`src/constants.js`**: Contains configuration specific to the selected network.  
- **`src/utils/estimate_max_fee.js`**: Contains logic to estimate the maximum fee sent to the batcher in the proof submission message.  
- **`src/utils/batcher.js`**: Retrieves the user’s nonce from the batcher via an RPC call.  

## Data Configuration

### Testing addresses

The system supports two file formats for providing funded test accounts:

- The first is a CSV file (`data/sepolia_rich_accounts.csv`) with the private key and address in the header.  
- The second is a JSON file (`data/rich_accounts.json`), which consists of an array of objects containing `address` and `privateKey` fields.  

### Game solution file

The test requires a solution to generate the Circom proof that certifies users have completed the game.  
The solution is read from the `data/solution.json` file, which contains the level boards and user positions for each level in JSON format.  

You can copy this data from the browser’s local storage variable `parity-game-data`, which contains the solution played by the user for that specific game configuration.

## Environment Configuration

### Configuration variables (`constants.js`)

As mentioned before, this file contains the network-specific variables for the chain being tested. For example, the Sepolia network configuration looks like this:

```javascript
RPC_URL = 'https://ethereum-sepolia-rpc.publicnode.com'
ZK_ARCADE_URL = "https://test.zkarcade.com"
BATCHER_URL = "wss://sepolia.batcher.alignedlayer.com"
BATCHER_PAYMENT_SERVICE_ADDR = "0x403dE630751e148bD71BFFcE762E5667C0825399"
USED_CHAIN = sepolia
```

TODO: Move these values into a .env file specific to each network (at least Sepolia and Devnet).

### Dependencies

The test requires the following Node.js dependencies:

- `viem`
- `snarkjs`
- `axios/undici`
- `csv-parse`
- `sha3`

## Execution

1. Install the project dependencies:

    ```bash
    npm install
    ```

2. Add your funded account for the tested network in either `data/sepolia_rich_accounts.csv` or `data/rich_accounts.json`.
    - If needed, you can generate test accounts for Devnet using the generate_rich_wallets.sh script: `./generate_rich_wallets.sh <accounts_number>`
3. Make sure that `data/solution.json` contains a valid solution. Note that it does not need to be updated between runs.

4. Run the Test

    ```bash
    node src/stress_test.js
    ```
