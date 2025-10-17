
# devnet | mainnet | holesky | holesky-stage | sepolia
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
	@docker compose up -d db --wait && \
		cd web/ && \
		mix ecto.migrate

web_metrics:
	@docker compose up -d prometheus grafana --wait

web_metrics_stop:
	@docker stop zk_arcade_prometheus zk_arcade_grafana || true  && \
		docker rm zk_arcade_prometheus zk_arcade_grafana || true

web_migrate:
	@cd web/ && \
	mix ecto.migrate

web_run: web_deps web_db web_metrics
	@cd web/ && \
	iex -S mix phx.server

web_remove_db_container:
	@docker stop zk_arcade_db || true  && \
		docker rm zk_arcade_db || true

web_clean_db: web_remove_db_container
	@docker volume rm zkarcade-postgres-data || true


__GAME__:
play_beast:
	@cd games/beast/ && cargo run --release --bin beast --features $(NETWORK)

submit_beast_solution:
	@cp games/beast/beast1984/cmd/.$(NETWORK).env games/beast/beast1984/cmd/.env
	@cd games/beast && cargo run --manifest-path ./beast1984/Cargo.toml --release --bin submit_solution

NUM_GAMES ?= 10
LEVELS_PER_GAME ?= 8
CAMPAIGN_DAYS ?= 1
BEAST_SUBMISSION_OFFSET_MINUTES ?= 720
beast_gen_levels:
	@cd games/beast && cargo run --bin gen_levels $(NUM_GAMES) $(LEVELS_PER_GAME) $(CAMPAIGN_DAYS) $(BEAST_SUBMISSION_OFFSET_MINUTES) $(NETWORK)
	
beast_build:
	@cd games/beast/beast1984 && cargo build --release --bin beast --features sepolia

beast_build_sepolia:
	@cd games/beast/beast1984 && cargo build --release --bin beast --features sepolia

beast_build_mainnet:
	@cd games/beast/beast1984 && cargo build --release --bin beast --features mainnet

beast_build_sepolia_windows:
	@cd games/beast/beast1984 && cargo build --release --bin beast --features sepolia --target x86_64-pc-windows-gnu

beast_build_mainnet_windows:
	@cd games/beast/beast1984 && cargo build --release --bin beast --features mainnet --target x86_64-pc-windows-gnu

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
# Number of calendar days the campaign spans (scheduling/rotation; not difficulty).
# Each game takes (campaign days * 24hs / num games) hs
PARITY_CAMPAIGN_DAYS ?= 1
# Total number of games in the campaign (pattern repeats per game).
PARITY_NUM_GAMES ?= 10
# Adds a time offset to the ends_at to allow a bit more time for claiming
PARITY_SUBMISSION_OFFSET_MINUTES ?= 720 
# Levels per game (indexes 0..L-1). Can be up to 3 (fits proof data in 32 bytes).
PARITY_LEVELS_PER_GAME ?= 3
# UI-only: lower bound for numbers shown at the end of a level on the board.
# Does NOT affect difficulty or movement calculations.
PARITY_MIN_END_OF_LEVEL ?= 12
# UI-only: upper bound for numbers shown at the end of a level on the board.
# Does NOT affect difficulty or movement calculations.
PARITY_MAX_END_OF_LEVEL ?= 50
# Movement budget at level 0 (first level). Defines the start of the ramp.
PARITY_MIN_MOVEMENTS ?= 15
# Movement budget at the last level. Defines the top of the ramp.
PARITY_MAX_MOVEMENTS ?= 45
parity_gen_levels:
	@cd games/parity/level_generator && \
	cargo run --release $(PARITY_NUM_GAMES) $(PARITY_LEVELS_PER_GAME) $(PARITY_MIN_END_OF_LEVEL) $(PARITY_MAX_END_OF_LEVEL) \
	$(PARITY_MIN_MOVEMENTS) $(PARITY_MAX_MOVEMENTS) $(PARITY_CAMPAIGN_DAYS) $(PARITY_SUBMISSION_OFFSET_MINUTES) $(NETWORK)

parity_write_program_vk:
	@cd games/parity/circuits/cmd && cargo run --release

# Note: this target requires sed, which makes it only available on MacOS
update_leaderboard_address: ## Update leaderboard contract address in web config for DEV environment
	@set -e; \
	addr=$$(jq -r '(.. | objects | to_entries[]? | select(.key|test("proxy";"i")) | .value) // empty' "contracts/script/output/devnet/leaderboard.json" \
		| grep -Eo "0x[0-9a-fA-F]{40}" | head -n1); \
	sed -E -i '' "s|(^[[:space:]]*config :zk_arcade, :leaderboard_address, \")[^\"]+(\".*)|\1$$addr\2|" "web/config/dev.exs";

update_nft_address: ## Set the NFT contract address in web config for DEV environment
	@set -e; \
	addr=$$(jq -r '(.. | objects | to_entries[]? | select(.key|test("proxy";"i")) | .value) // empty' "contracts/script/output/devnet/nft.json" \
		| grep -Eo "0x[0-9a-fA-F]{40}" | head -n1); \
	sed -E -i '' "s|(^[[:space:]]*config :zk_arcade, :nft_contract_address, \")[^\"]+(\".*)|\1$$addr\2|" "web/config/dev.exs";

__CONTRACTS__:

deploy_nft_contract: submodules
	@. contracts/scripts/.$(NETWORK).env && . contracts/scripts/deploy_nft_contract.sh

deploy_leaderboard_contract: submodules
	@. contracts/scripts/.$(NETWORK).env && . contracts/scripts/deploy_leaderboard_contract.sh

generate_merkle_tree:
	@cd merkle_tree && cargo run --release -- $(WHITELIST_PATH) $(OUTPUT_PATH) $(MERKLE_ROOT_INDEX)

add_merkle_root: submodules
	@. contracts/scripts/.$(NETWORK).env && . contracts/scripts/add_merkle_root.sh "$(MERKLE_ROOT_INDEX)" "$(OUTPUT_PATH)"

gen_levels_and_deploy_contracts_devnet: beast_gen_levels parity_gen_levels web_db
	@jq ".games = $$(jq '.games' games/beast/levels/leaderboard_devnet.json)" \
		contracts/script/deploy/config/devnet/leaderboard.json \
		> tmp.$$.json && mv tmp.$$.json contracts/script/deploy/config/devnet/leaderboard.json
	@jq ".parityGames = $$(jq '.games' games/parity/level_generator/levels/parity_devnet.json)" \
		contracts/script/deploy/config/devnet/leaderboard.json \
		> tmp.$$.json && mv tmp.$$.json contracts/script/deploy/config/devnet/leaderboard.json
	@$(MAKE) deploy_nft_contract NETWORK=devnet
	@jq ".zkArcadeNftContract = \"$$(jq -r '.addresses.proxy' contracts/script/output/devnet/nft.json)\"" \
		contracts/script/deploy/config/devnet/leaderboard.json \
		> tmp.$$.json && mv tmp.$$.json contracts/script/deploy/config/devnet/leaderboard.json
	@$(MAKE) deploy_leaderboard_contract NETWORK=devnet
	@$(MAKE) update_leaderboard_address
	@$(MAKE) update_nft_address
	@$(MAKE) generate_merkle_tree WHITELIST_PATH=./whitelist_devnet.json OUTPUT_PATH=./merkle_output_devnet.json MERKLE_ROOT_INDEX=0
	@$(MAKE) add_merkle_root NETWORK=devnet

upgrade_contract: submodules
	@. contracts/scripts/.$(NETWORK).env && . contracts/scripts/upgrade_contract.sh

upgrade_nft_contract: submodules
	@. contracts/scripts/.$(NETWORK).env && . contracts/scripts/upgrade_nft_contract.sh

set_beast_games: submodules
	@. contracts/scripts/.$(NETWORK).env && . contracts/scripts/set_beast_games.sh

set_parity_games:
	@. contracts/scripts/.$(NETWORK).env && . contracts/scripts/set_parity_games.sh

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
	@echo "MIX_ENV=prod" >> /home/app/config/.env.zk_arcade
	@echo "PHX_SERVER=true" >> /home/app/config/.env.zk_arcade
	@echo "DATABASE_URL=ecto://zk_arcade_user:${DB_PASSWORD}@127.0.0.1/zk_arcade_db" >> /home/app/config/.env.zk_arcade
	@echo "POOL_SIZE=64" >> /home/app/config/.env.zk_arcade
	@echo "SECRET_KEY_BASE=${SECRET_KEY_BASE}" >> /home/app/config/.env.zk_arcade
	@echo "PHX_HOST=${PHX_HOST}" >> /home/app/config/.env.zk_arcade
	@echo "KEYFILE_PATH=/home/app/.ssl/key.pem" >> /home/app/config/.env.zk_arcade
	@echo "CERTFILE_PATH=/home/app/.ssl/cert.pem" >> /home/app/config/.env.zk_arcade
	@echo "RPC_URL=${RPC_URL}" >> /home/app/config/.env.zk_arcade
	@echo "ZK_ARCADE_NETWORK=mainnet" >> /home/app/config/.env.zk_arcade
	@echo "ALIGNED_PAYMENT_SERVICE_ADDRESS=0xb0567184A52cB40956df6333510d6eF35B89C8de" >> /home/app/config/.env.zk_arcade
	@echo "ALIGNED_SERVICE_MANAGER_ADDRESS=0xeF2A435e5EE44B2041100EF8cbC8ae035166606c" >> /home/app/config/.env.zk_arcade
	@echo "ZK_ARCADE_LEADERBOARD_ADDRESS=" >> /home/app/config/.env.zk_arcade
	@echo "ZK_ARCADE_NFT_CONTRACT_ADDRESS=" >> /home/app/config/.env.zk_arcade
	@echo "BATCHER_HOST=mainnet.batcher.alignedlayer.com" >> /home/app/config/.env.zk_arcade
	@echo "BATCHER_PORT=443" >> /home/app/config/.env.zk_arcade
	@echo "BATCHER_URL=wss://mainnet.batcher.alignedlayer.com" >> /home/app/config/.env.zk_arcade
	@echo "EXPLORER_URL=https://explorer.alignedlayer.com" >> /home/app/config/.env.zk_arcade
	@echo "FEEDBACK_FORM_URL=" >> /home/app/config/.env.zk_arcade
	@echo "BEAST_WINDOWS_DOWNLOAD_URL=https://github.com/yetanotherco/zk_arcade/releases/download/v0.6.0/beast.exe" >> /home/app/config/.env.zk_arcade
	@echo "IP_INFO_API_KEY=${IP_INFO_API_KEY}" >> /home/app/config/.env.zk_arcade
	@echo "IPGEOLOCATION_API_KEY=${IPGEOLOCATION_API_KEY}" >> /home/app/config/.env.zk_arcade

create_env_holesky:
	@truncate -s0 /home/app/config/.env.zk_arcade
	@echo "MIX_ENV=prod" >> /home/app/config/.env.zk_arcade
	@echo "PHX_SERVER=true" >> /home/app/config/.env.zk_arcade
	@echo "DATABASE_URL=ecto://zk_arcade_user:${DB_PASSWORD}@127.0.0.1/zk_arcade_db" >> /home/app/config/.env.zk_arcade
	@echo "POOL_SIZE=64" >> /home/app/config/.env.zk_arcade
	@echo "SECRET_KEY_BASE=${SECRET_KEY_BASE}" >> /home/app/config/.env.zk_arcade
	@echo "PHX_HOST=${PHX_HOST}" >> /home/app/config/.env.zk_arcade
	@echo "KEYFILE_PATH=/home/app/.ssl/key.pem" >> /home/app/config/.env.zk_arcade
	@echo "CERTFILE_PATH=/home/app/.ssl/cert.pem" >> /home/app/config/.env.zk_arcade
	@echo "RPC_URL=${RPC_URL}" >> /home/app/config/.env.zk_arcade
	@echo "ZK_ARCADE_NETWORK=holesky" >> /home/app/config/.env.zk_arcade
	@echo "ALIGNED_PAYMENT_SERVICE_ADDRESS=0x815aeCA64a974297942D2Bbf034ABEe22a38A003" >> /home/app/config/.env.zk_arcade
	@echo "ALIGNED_SERVICE_MANAGER_ADDRESS=0x58F280BeBE9B34c9939C3C39e0890C81f163B623" >> /home/app/config/.env.zk_arcade
	@echo "ZK_ARCADE_LEADERBOARD_ADDRESS=0xA8FED3cEEd5E5f5c8B862730E668f4585aD72fE0" >> /home/app/config/.env.zk_arcade
	@echo "ZK_ARCADE_NFT_CONTRACT_ADDRESS=0xF0c8CD5Aaf19bdD63eC353AA342a6518D4458B8F" >> /home/app/config/.env.zk_arcade
	@echo "BATCHER_HOST=batcher.alignedlayer.com" >> /home/app/config/.env.zk_arcade
	@echo "BATCHER_PORT=443" >> /home/app/config/.env.zk_arcade
	@echo "BATCHER_URL=wss://batcher.alignedlayer.com" >> /home/app/config/.env.zk_arcade
	@echo "EXPLORER_URL=https://holesky.explorer.alignedlayer.com" >> /home/app/config/.env.zk_arcade
	@echo "FEEDBACK_FORM_URL=" >> /home/app/config/.env.zk_arcade
	@echo "BEAST_WINDOWS_DOWNLOAD_URL=https://github.com/yetanotherco/zk_arcade/releases/download/v0.6.0/beast.exe" >> /home/app/config/.env.zk_arcade

## Deploy
release: export MIX_ENV=prod
release:
	cd web && \
	mix local.hex --force && \
	mix local.rebar --force && \
	mix deps.get --only $(MIX_ENV) && \
	mix compile && \
	npm --prefix assets ci && \
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

## Monitoring
install_prometheus:
	@./infra/install_prometheus.sh

install_grafana:
	@./infra/install_grafana.sh

update_grafana_dashboards:
	@./infra/update_grafana_dashboards.sh
