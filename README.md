# ZK_Arcade

Zk arcade repo

## Games

- [Beast](./games/beast)

## Run Locally

1. You need to run [Aligned](https://github.com/yetanotherco/aligned_layer) locally.

2. Make sure you are running Docker.

3. Deploy the Leaderboard contract with:

  ```
  make deploy_contract NETWORK=devnet
  ```

4. Set the Contract proxy address in `web/config/dev.exs`:

  ```elixir
  config :zk_arcade, :leaderboard_address, "<COMPLETE_ADDRESS_FROM_OUTPUT>"
  ```

5. Start the server:

  ```
  make web_run
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
