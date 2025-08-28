#!/bin/bash

# cd to the directory of this script so that this can be run from anywhere
parent_path=$( cd "$(dirname "${BASH_SOURCE[0]}")" ; pwd -P )
# At this point we are in scripts/contracts/
cd "$parent_path"

# cd to contracts/
cd ../

# Deploy NFT Contract with Merkle Tree
CMD="forge script script/deploy/NftContractDeployer.s.sol:NftContractDeployer \
    $NFT_CONFIG_PATH \
    $NFT_OUTPUT_PATH \
    --rpc-url $RPC_URL \
    --private-key $DEPLOYER_PRIVATE_KEY \
    --broadcast \
    --sig \"run(string memory configPath, string memory outputPath)\""

if [ -n "$ETHERSCAN_API_KEY" ]; then
    CMD+=" --etherscan-api-key $ETHERSCAN_API_KEY --verify"
else
    echo "Warning: ETHERSCAN_API_KEY not set. Skipping contract verification."
fi

eval $CMD

# Generate Merkle Proofs for frontend
MERKLE_PROOFS_PATH="script/output/devnet/merkle-proofs.json"
forge script script/deploy/GenerateMerkleProofs.s.sol:GenerateMerkleProofs \
    $NFT_CONFIG_PATH \
    $MERKLE_PROOFS_PATH \
    --sig "run(string memory configPath, string memory outputFilePath)"

# Obtain the proxy address and copy it to the leaderboard config
nft_contract_proxy=$(jq -r '.addresses.proxy' $NFT_OUTPUT_PATH)
merkle_root=$(jq -r '.merkle.root' $NFT_OUTPUT_PATH)

jq --arg nft_contract_proxy "$nft_contract_proxy" '.zkArcadeNftContract = $nft_contract_proxy' $CONFIG_PATH > "script/deploy/config/devnet/leaderboard_temp.json"
mv "script/deploy/config/devnet/leaderboard_temp.json" $CONFIG_PATH

# Deploy Leaderboard
CMD="forge script script/deploy/LeaderboardDeployer.s.sol:LeaderboardDeployer \
    $CONFIG_PATH \
    $OUTPUT_PATH \
    --rpc-url $RPC_URL \
    --private-key $DEPLOYER_PRIVATE_KEY \
    --broadcast \
    --sig \"run(string memory configPath, string memory outputPath)\""

if [ -n "$ETHERSCAN_API_KEY" ]; then
    CMD+=" --etherscan-api-key $ETHERSCAN_API_KEY --verify"
else
    echo "Warning: ETHERSCAN_API_KEY not set. Skipping contract verification."
fi

eval $CMD
