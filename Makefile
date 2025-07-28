
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
STARTS_AT_BLOCK_NUMBER ?= 0
CAMPAIGN_DAYS ?= 1
beast_gen_levels:
	@cd games/beast && cargo run --bin gen_levels $(NUM_GAMES) $(LEVELS_PER_GAME) $(STARTS_AT_BLOCK_NUMBER) $(CAMPAIGN_DAYS) $(NETWORK)
	
__CONTRACTS__:
deploy_contract: submodules
	@. contracts/scripts/.$(NETWORK).env && . contracts/scripts/deploy_contract.sh

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
	@echo "ZK_ARCADE_LEADERBOARD_ADDRESS=0x02792Dab0272BB69fEa61a69b934b44c69fD7b33" >> /home/app/config/.env.zk_arcade
	@echo "BATCHER_HOST=stage.batcher.alignedlayer.com" >> /home/app/config/.env.zk_arcade
	@echo "BATCHER_PORT=443" >> /home/app/config/.env.zk_arcade
	@echo "BATCHER_URL=wss://stage.batcher.alignedlayer.com" >> /home/app/config/.env.zk_arcade


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
