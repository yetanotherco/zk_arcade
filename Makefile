.PHONY: play_beast submit_beast_solution deploy_contract

# devnet | holesky
NETWORK=devnet

__GAMES__:
play_beast:
	cd beast1984 && cargo run --release --bin beast

submit_beast_solution:
	cargo run --manifest-path ./beast1984/Cargo.toml --release --bin submit_solution

__CONTRACTS__:
deploy_contract:
	@. contracts/scripts/.$(NETWORK).env && . contracts/scripts/deploy_contract.sh
