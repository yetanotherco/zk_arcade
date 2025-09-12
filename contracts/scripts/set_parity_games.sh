#!/bin/bash

# cd to the directory of this script so that this can be run from anywhere
parent_path=$( cd "$(dirname "${BASH_SOURCE[0]}")" ; pwd -P )
# At this point we are in contracts/scripts
cd "$parent_path"

# At this point we are in contracts
cd ../

echo "Setting Parity Games..."

# Set Parity Games
forge script script/deploy/SetParityGames.s.sol:SetParityGames \
    $CONFIG_PATH \
    $OUTPUT_PATH \
    --rpc-url $RPC_URL \
    --private-key $DEPLOYER_PRIVATE_KEY \
    --broadcast \
    --sig "run(string memory configPath, string memory leaderboardDeploymentFilePath)"

echo "Parity Games set successfully."
