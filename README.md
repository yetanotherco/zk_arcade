# ZK_Arcade

Zk arcade repo

## Games

- [Beast](./games/beast)

### Installation

To install Beast, run the following command:

```bash
curl -L https://raw.githubusercontent.com/yetanotherco/zk_arcade/main/install_beast.sh | bash
```

## Requirements

- Rust
- Elixir
- Node.js
- Docker
- Foundry

## Run Locally

1. You need to run [Aligned](https://github.com/yetanotherco/aligned_layer) locally.

2. Make sure you are running Docker.

3. Send funds to your wallet from anvil pre-funded account with:

   ```
   cast send <YOUR_WALLET_ADDRESS> --value 10ether --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 --rpc-url http://localhost:8545
   ```

4. Add the `devnet` network to your wallet using the following parameters:

    - Network Name: Anvl
    - Chain ID: 31337
    - RPC URL: http://localhost:8545
    - Currency Symbol: ETH

5. Deploy the Leaderboard contract with:

   ```
   make deploy_contract NETWORK=devnet
   ```

6. Set the Contract proxy address in `web/config/dev.exs`:

   ```elixir
   config :zk_arcade, :leaderboard_address, "<COMPLETE_ADDRESS_FROM_OUTPUT>"
   ```

7. Start the server:

   ```
   make web_run
   ```

### Other commands

If you want to clean the database, run:

```
web_clean_db
```

## Deployment

### First Deploy

As admin user, run:

```
cd /tmp
git clone git@github.com:yetanotherco/zk_arcade.git
cd zk_arcade
make debian_deps DB_PASSWORD=<>
make release
make release_install
```

As app user, run:

1. `cd` to the repo

  ```
  cd zk_arcade
  ```

2. Generate a SECRET_KEY_BASE with:

  ```
  MIX_ENV=prod mix phx.gen.secret
  ```

3. Create the env file, depending on the network:

- mainnet
```
make create_env_mainnet DB_PASSWORD=<> SECRET_KEY_BASE=<> PHX_HOST=<> NEWRELIC_KEY=<>
```

4. Run the service with:

  ```
  make create_service
  ```

### Redeployments

As admin user, run:

```
cd /tmp
git clone git@github.com:yetanotherco/zk_arcade.git
cd zk_arcade
make release
make release install
```

As app user, run:

```
systemctl restart zk_arcade --user
```

## Address Whitelisting

This process works for both exclusive and public NFT whitelists. Note that the first option allows the user to claim the original NFT for free (although they still need to pay the transaction fee), while the second option gives the user a discount on the public NFT price.

First, we run a preprocessing step on the address whitelist to ensure it contains no duplicate or invalid addresses. Then, we use the valid addresses to generate the Merkle proof data for the new campaign, which will be stored in the database and added to the NFT contract.

### Prerequisites

The preprocessing script requires Python with pandas. Set up a virtual environment:

```shell
# Create virtual environment
python3 -m venv ~/.python_venvs/pandas_venv

# Activate virtual environment
source ~/.python_venvs/pandas_venv/bin/activate

# Install dependencies
pip install -r data/requirements.txt
```

### Preprocessing Workflow

To run the preprocessing:

1. Put your addresses in `whitelist_addresses.csv`, or provide your own CSV file.
2. Activate the Python virtual environment:
   ```shell
   source ~/.python_venvs/pandas_venv/bin/activate
   ```
3. Run the preprocessing script:
   ```shell
   make preprocess_whitelist WHITELIST_PATH=<whitelist_path> INSERTED_DIRECTORY=<inserted_directory>
   ```
   Where:
   - `WHITELIST_PATH`: Path to the CSV file containing the addresses to whitelist. You can use the whitelist_addresses.csv file in discount or exclusive folder, or use your own csv file.
   - `INSERTED_DIRECTORY`: Directory containing previously inserted addresses (default: `data/exclusive/inserted`, for devnet use: `data/inserted_devnet`)
4. Removed addresses will be written to `removed_addresses.csv`, and the addresses to generate Merkle proof data will be written to `new_addresses.csv` into `data` directory.

### Merkle Proof Data Generation

1. Complete `.env` file into `merkle_tree/.env` with the required environment variables.
   ```
   DATABASE_URL=postgresql://<USER>:<PASSWORD>@<HOST>:<PORT>/<DB_NAME>
   ```
2. Run:
   ```shell
   make generate_merkle_tree WHITELIST_PATH=data/new_addresses.csv OUTPUT_FILE=./merkle_tree/merkle_output.json MERKLE_ROOT_INDEX=<campaign_number> INSERTED_DIRECTORY=<directory>
   ```  
   Where:
   - `WHITELIST_PATH`: Path to the CSV file with addresses (usually `data/exclusive/new_addresses.csv` or `data/discount/new_addresses.csv` from preprocessing)
   - `OUTPUT_FILE`: Path where the Merkle proof JSON will be written
   - `MERKLE_ROOT_INDEX`: Campaign number (must match the index the merkle root will take in the contract)
   - `INSERTED_DIRECTORY`: Directory where filtered addresses CSV will be saved as `inserted_<MERKLE_ROOT_INDEX>.csv`
   
   For devnet, use: `INSERTED_DIRECTORY=./data/inserted_devnet`
3. This command generates the Merkle proof data, stores the Merkle paths in the backend database, writes the campaign Merkle root to the output file, and saves filtered addresses to the specified directory.
4. Add the new campaign Merkle root to the NFT contract by running:  
   ```shell
   make add_merkle_root NETWORK=<network>
   ```
   or, if you are adding the root for the public NFT discount whitelist:
   ```shell
   make add_merkle_root_public NETWORK=<network>
   ```

## Mark pending proofs as failed

The following is a step by step on how to mark all `pending` proofs as `failed` and verify that the change is consistent.

## Step 1: Check current proofs
See which proofs are currently `pending` or `failed`.

```sql
SELECT COUNT(*) FROM proofs WHERE status = 'pending';
SELECT COUNT(*) FROM proofs WHERE status = 'failed';
```

if you want to see their ids you can do:

```sql
SELECT id FROM proofs WHERE status = 'pending';
SELECT id FROM proofs WHERE status = 'failed';
```

## Step 2: Begin a transaction and run update
```sql
BEGIN;
UPDATE proofs SET status = 'failed' WHERE status = 'pending';
```


## Step 3: Verify the result

Confirm that the number of failed proofs now equals the old failed count plus the old pending count, that is:

$$
failedProofs_t = failedProofs_{t-1} + pendingProofs_{t-1}
$$

```sql
SELECT COUNT(*) FROM proofs WHERE status = 'pending';
SELECT COUNT(*) FROM proofs WHERE status = 'failed';
```

## Step 4: Commit the changes

If everything went well commit the changes

```sql
COMMIT;
```

otherwise, rollback and start again

```sql
ROLLBACK;
```
