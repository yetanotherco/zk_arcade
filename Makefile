
# devnet | mainnet | holesky | holesky-stage
NETWORK ?= devnet

__DEPENDENCIES__: ## ____

submodules: ## Initialize and update git submodules
	git submodule update --init --recursive
	@echo "Updated submodules"

__WEB__: ## ____

web_deps:
	@cd web/ && \
	mix deps.get && \
	cd assets && npm install

web_db:
	@cd web/ && \
	docker compose up -d db --wait && \
	mix ecto.migrate

web_migrate:
	@cd web/ && \
	mix ecto.migrate

web_run: web_deps web_db
	@cd web/ && \
	iex -S mix phx.server

web_remove_db_container:
	@cd web && \
		docker stop zk_arcade_db || true  && \
		docker rm zk_arcade_db || true

web_clean_db: web_remove_db_container
	@cd web && \
		docker volume rm zkarcade-postgres-data || true


__GAME__:
play_beast:
	@cd games/beast/ && cargo run --release --bin beast --features $(NETWORK)

submit_beast_solution:
	@cp games/beast/beast1984/cmd/.$(NETWORK).env games/beast/beast1984/cmd/.env
	@cd games/beast && cargo run --manifest-path ./beast1984/Cargo.toml --release --bin submit_solution

NUM_GAMES ?= 10
LEVELS_PER_GAME ?= 8
CAMPAIGN_DAYS ?= 1
beast_gen_levels:
	@cd games/beast && cargo run --bin gen_levels $(NUM_GAMES) $(LEVELS_PER_GAME) $(CAMPAIGN_DAYS) $(NETWORK)
	
beast_build:
	@cd games/beast/beast1984 && cargo build --release --bin beast --features holesky

beast_write_program_vk:
	@cd games/beast/beast1984/ && cargo run --release --bin write_program_vk

# ─────────────────────────────────────────────────────────────────────────────
# Difficulty / campaign parameters (annotated)
# Growth model (per game):
#   steps      := max(PARITY_LEVELS_PER_GAME - 1, 1)
#   step_size  := ceil((PARITY_MAX_MOVEMENTS - PARITY_MIN_MOVEMENTS) / steps)
#   level_i    := min(PARITY_MIN_MOVEMENTS + i * step_size, PARITY_MAX_MOVEMENTS)
# With defaults (levels=3, min=15, max=45): levels → [15, 30, 45]
# ─────────────────────────────────────────────────────────────────────────────
# Total number of games in the campaign (pattern repeats per game).
PARITY_NUM_GAMES ?= 10
# Levels per game (indexes 0..L-1). Can be up to 3 (fits proof data in 32 bytes).
PARITY_LEVELS_PER_GAME ?= 3
# UI-only: lower bound for numbers shown at the end of a level on the board.
# Does NOT affect difficulty or movement calculations.
PARITY_MIN_END_OF_LEVEL ?= 8
# UI-only: upper bound for numbers shown at the end of a level on the board.
# Does NOT affect difficulty or movement calculations.
PARITY_MAX_END_OF_LEVEL ?= 50
# Movement budget at level 0 (first level). Defines the start of the ramp.
PARITY_MIN_MOVEMENTS ?= 15
# Movement budget at the last level. Defines the top of the ramp.
PARITY_MAX_MOVEMENTS ?= 45
# Number of calendar days the campaign spans (scheduling/rotation; not difficulty).
PARITY_CAMPAIGN_DAYS ?= 1
parity_gen_levels:
	@cd games/parity/level_generator && \
	cargo run --release $(PARITY_NUM_GAMES) $(PARITY_LEVELS_PER_GAME) $(PARITY_MIN_END_OF_LEVEL) $(PARITY_MAX_END_OF_LEVEL) \
	$(PARITY_MIN_MOVEMENTS) $(PARITY_MAX_MOVEMENTS) $(PARITY_CAMPAIGN_DAYS) $(NETWORK)

parity_write_program_vk:
	@cd games/parity/circuits/cmd && cargo run --release

# Note: this target requires sed, which makes it only available on MacOS
update_leaderboard_address:
	@set -e; \
	addr=$$(jq -r '(.. | objects | to_entries[]? | select(.key|test("proxy";"i")) | .value) // empty' "contracts/script/output/devnet/leaderboard.json" \
		| grep -Eo "0x[0-9a-fA-F]{40}" | head -n1); \
	sed -E -i '' "s|(^[[:space:]]*config :zk_arcade, :leaderboard_address, \")[^\"]+(\".*)|\1$$addr\2|" "web/config/dev.exs";

update_nft_address:
	@set -e; \
	addr=$$(jq -r '(.. | objects | to_entries[]? | select(.key|test("proxy";"i")) | .value) // empty' "contracts/script/output/devnet/nft.json" \
		| grep -Eo "0x[0-9a-fA-F]{40}" | head -n1); \
	sed -E -i '' "s|(^[[:space:]]*config :zk_arcade, :nft_contract_address, \")[^\"]+(\".*)|\1$$addr\2|" "web/config/dev.exs";

gen_and_deploy_devnet: beast_gen_levels parity_gen_levels web_db
	@jq ".games = $$(jq '.games' games/beast/levels/leaderboard_devnet.json)" \
		contracts/script/deploy/config/devnet/leaderboard.json \
		> tmp.$$.json && mv tmp.$$.json contracts/script/deploy/config/devnet/leaderboard.json
	@jq ".parityGames = $$(jq '.games' games/parity/level_generator/levels/parity_devnet.json)" \
		contracts/script/deploy/config/devnet/leaderboard.json \
		> tmp.$$.json && mv tmp.$$.json contracts/script/deploy/config/devnet/leaderboard.json
	@$(MAKE) deploy_contract NETWORK=devnet
	@$(MAKE) update_leaderboard_address
	@$(MAKE) update_nft_address

__CONTRACTS__:
MERKLE_ROOT_INDEX ?= 0
deploy_contract: submodules
	@. contracts/scripts/.$(NETWORK).env && . contracts/scripts/deploy_contract.sh $(MERKLE_ROOT_INDEX)

upgrade_contract: submodules
	@. contracts/scripts/.$(NETWORK).env && . contracts/scripts/upgrade_contract.sh

set_beast_games: submodules
	@. contracts/scripts/.$(NETWORK).env && . contracts/scripts/set_beast_games.sh

# This path is relative to the project root
WHITELIST_PATH?=merkle_tree/whitelist.json
nft_whitelist_addresses: submodules
	@. contracts/scripts/.$(NETWORK).env && . contracts/scripts/create_new_campaign.sh "$(MERKLE_ROOT_INDEX)" "$(WHITELIST_PATH)"

__INFRA__: ## ____
## Initial Setup
debian_create_dirs:
	sudo mkdir -p /home/app/.ssl
	sudo mkdir -p /home/app/zk_arcade
	sudo mkdir -p /home/app/config
	sudo mkdir -p /home/app/.config/systemd/user
	sudo chown app:app -R /home/app/.ssl
	sudo chown app:app -R /home/app/zk_arcade
	sudo chown app:app -R /home/app/config
	sudo chown app:app -R /home/app/.config

debian_install_deps:
	sudo apt update -y
	sudo apt install -y curl vim git ufw build-essential htop tmux autoconf m4 libncurses5-dev libssh-dev libncurses-dev libsctp1
	wget -P /tmp/ http://ftp.de.debian.org/debian/pool/main/o/openssl/libssl1.1_1.1.1w-0+deb11u1_amd64.deb
	sudo dpkg -i /tmp/libssl1.1_1.1.1w-0+deb11u1_amd64.deb
	rm /tmp/libssl1.1_1.1.1w-0+deb11u1_amd64.deb

debian_apply_firewall:
	sudo ufw allow 22
	sudo ufw allow 41641
	sudo ufw allow 443
	sudo ufw enable

debian_install_erlang:
	wget -P /tmp/ https://github.com/erlang/otp/releases/download/OTP-27.0/otp_src_27.0.tar.gz
	tar -xzvf /tmp/otp_src_27.0.tar.gz -C /tmp/
	cd /tmp/otp_src_27.0/ && ./configure && make && sudo make install
	rm -rf /tmp/otp_src_27.0.tar.gz /tmp/otp_src_27.0/

debian_install_elixir:
	wget -P /tmp/ https://github.com/elixir-lang/elixir/releases/download/v1.17.3/elixir-otp-27.zip
	sudo unzip -o /tmp/elixir-otp-27.zip -d /usr/local/
	rm -rf /tmp/elixir-otp-27.zip

debian_install_nodejs:
	wget -P /tmp/ https://nodejs.org/dist/v23.4.0/node-v23.4.0-linux-x64.tar.xz
	sudo tar --strip-components=1 --directory=/usr/local/ -xf /tmp/node-v23.4.0-linux-x64.tar.xz
	sudo rm /tmp/node-v23.4.0-linux-x64.tar.xz

user_install_rust:
	curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y

debian_install_postgres:
	sudo apt install -y postgresql-common
	sudo /usr/share/postgresql-common/pgdg/apt.postgresql.org.sh -y
	sudo apt install -y postgresql-16

debian_setup_postgres: ## Requires DB_PASSWORD
	sudo -u postgres psql -U postgres -c "CREATE USER "zk_arcade_user" WITH PASSWORD '$(DB_PASSWORD)';"
	sudo -u postgres psql -U postgres -c "CREATE DATABASE "zk_arcade_db" OWNER 'zk_arcade_user';"

debian_deps: debian_create_dirs debian_install_deps debian_apply_firewall debian_install_erlang debian_install_elixir debian_install_nodejs user_install_rust debian_install_postgres debian_setup_postgres

create_env_mainnet:
	@truncate -s0 /home/app/config/.env.zk_arcade
	@echo "PHX_SERVER=true" >> /home/app/config/.env.zk_arcade
	@echo "DATABASE_URL=ecto://zk_arcade_user:${DB_PASSWORD}@127.0.0.1/zk_arcade_db" >> /home/app/config/.env.zk_arcade
	@echo "POOL_SIZE=64" >> /home/app/config/.env.zk_arcade
	@echo "SECRET_KEY_BASE=${SECRET_KEY_BASE}" >> /home/app/config/.env.zk_arcade
	@echo "PHX_HOST=${PHX_HOST}" >> /home/app/config/.env.zk_arcade
	@echo "KEYFILE_PATH=/home/app/.ssl/key.pem" >> /home/app/config/.env.zk_arcade
	@echo "CERTFILE_PATH=/home/app/.ssl/cert.pem" >> /home/app/config/.env.zk_arcade
	@echo "ZK_ARCADE_NETWORK=mainnet" >> /home/app/config/.env.zk_arcade
	@echo "EXPLORER_URL=https://explorer.alignedlayer.com" >> /home/app/config/.env.zk_arcade

create_env_stage:
	@truncate -s0 /home/app/config/.env.zk_arcade
	@truncate -s0 /home/app/config/.env.zk_arcade
	@echo "PHX_SERVER=true" >> /home/app/config/.env.zk_arcade
	@echo "DATABASE_URL=ecto://zk_arcade_user:${DB_PASSWORD}@127.0.0.1/zk_arcade_db" >> /home/app/config/.env.zk_arcade
	@echo "POOL_SIZE=64" >> /home/app/config/.env.zk_arcade
	@echo "SECRET_KEY_BASE=${SECRET_KEY_BASE}" >> /home/app/config/.env.zk_arcade
	@echo "PHX_HOST=${PHX_HOST}" >> /home/app/config/.env.zk_arcade
	@echo "KEYFILE_PATH=/home/app/.ssl/key.pem" >> /home/app/config/.env.zk_arcade
	@echo "CERTFILE_PATH=/home/app/.ssl/cert.pem" >> /home/app/config/.env.zk_arcade
	@echo "RPC_URL=${RPC_URL}" >> /home/app/config/.env.zk_arcade
	@echo "ZK_ARCADE_NETWORK=holesky" >> /home/app/config/.env.zk_arcade
	@echo "ALIGNED_PAYMENT_SERVICE_ADDRESS=0x7577Ec4ccC1E6C529162ec8019A49C13F6DAd98b" >> /home/app/config/.env.zk_arcade
	@echo "ALIGNED_SERVICE_MANAGER_ADDRESS=0x9C5231FC88059C086Ea95712d105A2026048c39B" >> /home/app/config/.env.zk_arcade
	@echo "ZK_ARCADE_LEADERBOARD_ADDRESS=0x02792Dab0272BB69fEa61a69b934b44c69fD7b33" >> /home/app/config/.env.zk_arcade
	@echo "BATCHER_HOST=stage.batcher.alignedlayer.com" >> /home/app/config/.env.zk_arcade
	@echo "BATCHER_PORT=443" >> /home/app/config/.env.zk_arcade
	@echo "BATCHER_URL=wss://stage.batcher.alignedlayer.com" >> /home/app/config/.env.zk_arcade
	@echo "EXPLORER_URL=https://stage.explorer.alignedlayer.com" >> /home/app/config/.env.zk_arcade


## Deploy
release: export MIX_ENV=prod
release:
	cd web && \
	mix local.hex --force && \
	mix local.rebar --force && \
	mix deps.get --only $(MIX_ENV) && \
	mix compile && \
	npm --prefix assets install && \
	mix phx.digest && \
	mix assets.deploy && \
	mix release

release_install:
	sudo rm -rf /home/app/zk_arcade_bk
	sudo mv /home/app/zk_arcade /home/app/zk_arcade_bk
	sudo mv /tmp/zk_arcade /home/app/
	sudo chown app:app -R /home/app/zk_arcade
	sudo setcap CAP_NET_BIND_SERVICE=+eip /home/app/zk_arcade/web/_build/prod/rel/zk_arcade/erts-15.0/bin/beam.smp

create_service:
	@cp /home/app/zk_arcade/zk_arcade.service /home/app/.config/systemd/user/zk_arcade.service
	export $(cat config/.env.zk_arcade | xargs)
	systemctl --user daemon-reload
	systemctl --user enable --now zk_arcade
