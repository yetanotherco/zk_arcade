.PHONY: play_beast submit_beast_solution deploy_contract

# devnet | holesky-stage | holesky | mainnet
NETWORK=devnet

__GAME__:
play_beast:
	cd beast1984 && cargo run --release --bin beast

submit_beast_solution:
	@. ./beast1984/cmd/.$(NETWORK).env && . cargo run --manifest-path ./beast1984/Cargo.toml --release --bin submit_solution

__CONTRACTS__:
deploy_contract:
	@. contracts/scripts/.$(NETWORK).env && . contracts/scripts/deploy_contract.sh
