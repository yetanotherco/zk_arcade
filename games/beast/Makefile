.PHONY: play_beast submit_beast_solution deploy_contract

SHELL := /bin/bash

# devnet | holesky-stage | holesky | mainnet
NETWORK=holesky-stage

__GAME__:
play_beast:
	cd beast1984 && cargo run --release --bin beast

submit_beast_solution:
	@cp beast1984/cmd/.$(NETWORK).env beast1984/cmd/.env
	@cargo run --manifest-path ./beast1984/Cargo.toml --release --bin submit_solution

__CONTRACTS__:
deploy_contract:
	@cd ../../ && . contracts/scripts/.$(NETWORK).env && . contracts/scripts/deploy_contract.sh
