.PHONY: play_beast submit_beast_solution deploy_contract

# devnet | holesky
NETWORK=devnet

__GAMES__:
play_beast:
	cd beast1984 && cargo run --release --bin beast

submit_beast_solution:
	cd beast1984 && cargo run --release --bin submit_proof

__CONTRACTS__:
deploy_contract:
	@. .$(NETWORK).env && . contracts/scripts/deploy_contracts.sh

