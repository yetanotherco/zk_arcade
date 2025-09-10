#!/bin/bash

# cd to the directory of this script so that this can be run from anywhere
parent_path=$( cd "$(dirname "${BASH_SOURCE[0]}")" ; pwd -P )
# At this point we are in contracts/scripts/
cd "$parent_path"

# cd to contracts/
cd ..

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

# Print the deployed contract address
leaderboard_contract_proxy=$(jq -r '.addresses.proxy' $OUTPUT_PATH)
echo "Leaderboard Contract Proxy Address: $leaderboard_contract_proxy"
leaderboard_contract_implementation=$(jq -r '.addresses.implementation' $OUTPUT_PATH)
echo "Leaderboard Contract Implementation Address: $leaderboard_contract_implementation"