#!/bin/bash

# cd to the directory of this script so that this can be run from anywhere
parent_path=$( cd "$(dirname "${BASH_SOURCE[0]}")" ; pwd -P )
# At this point we are in contracts/scripts
cd "$parent_path"

# At this point we are in contracts
cd ../

merkle_root=$(jq -r '.root' $MERKLE_OUTPUT_PATH)

echo "Adding Merkle Root: $merkle_root"

# Get ZkArcadeNft proxy contract address from deployment output
nft_proxy_address=$(jq -r '.addresses.proxy' $NFT_OUTPUT_PATH)

# Call addMerkleRoot method
CMD="cast send $nft_proxy_address \
    \"addMerkleRoot(bytes32)\" \
    $merkle_root \
    --rpc-url $RPC_URL \
    --private-key $DEPLOYER_PRIVATE_KEY"

eval $CMD