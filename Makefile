
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
	cd games/beast/beast1984 && cargo run --release --bin beast

submit_beast_solution:
	@cp games/beast/beast1984/cmd/.$(NETWORK).env games/beast/beast1984/cmd/.env
	@cd games/beast && cargo run --manifest-path ./beast1984/Cargo.toml --release --bin submit_solution

NUM_GAMES ?= 10
LEVELS_PER_GAME ?= 8
STARTS_AT_BLOCK_NUMBER ?= 0
CAMPAIGN_DAYS ?= 1
NETWORK ?= devnet
beast_gen_levels:
	@cd games/beast && cargo run --bin gen_levels $(NUM_GAMES) $(LEVELS_PER_GAME) $(STARTS_AT_BLOCK_NUMBER) $(CAMPAIGN_DAYS) $(NETWORK)
	
__CONTRACTS__:
deploy_contract: submodules
	@. contracts/scripts/.$(NETWORK).env && . contracts/scripts/deploy_contract.sh
