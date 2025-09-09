#!/bin/bash

MERKLE_ROOT_INDEX=$1
WHITELIST_PATH=$2

# cd to the directory of this script so that this can be run from anywhere
parent_path=$( cd "$(dirname "${BASH_SOURCE[0]}")" ; pwd -P )
# At this point we are in scripts/contracts/
cd "$parent_path"

# cd to merkle_tree/
cd ../../merkle_tree/

# TODO: Check if any of the addresses in the whitelist ir already in the database
cargo run -- ../$WHITELIST_PATH $MERKLE_ROOT_INDEX

# # Generate the merkle root and the merkle proof for each address of the whitelist
# cargo run -- ../$WHITELIST_PATH merkle_output.json $MERKLE_ROOT_INDEX

# # Check if the merkle paths generation program failed
# if [ $? -ne 0 ]; then
#     echo "Error: Failed to generate merkle root. Exiting script."
#     exit 1
# fi

# merkle_root=$(jq -r '.root' merkle_output.json)

# # cd to contracts/
# cd ../contracts/

# # Get ZkArcadeNft proxy contract address from deployment output
# nft_proxy_address=$(jq -r '.addresses.proxy' script/output/devnet/nft.json)

# # Call addMerkleRoot method
# CMD="cast send $nft_proxy_address \
#     \"addMerkleRoot(bytes32)\" \
#     $merkle_root \
#     --rpc-url $RPC_URL \
#     --private-key $DEPLOYER_PRIVATE_KEY"

# if [ -n "$ETHERSCAN_API_KEY" ]; then
#     CMD+=" --etherscan-api-key $ETHERSCAN_API_KEY --verify"
# else
#     echo "Warning: ETHERSCAN_API_KEY not set. Skipping contract verification."
# fi

# eval $CMD
