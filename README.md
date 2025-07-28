# ZK_Arcade

Zk arcade repo

## Games

- [Beast](./games/beast)

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
