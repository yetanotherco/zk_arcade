#!/bin/bash

if [ -z "$MULTISIG" ]; then
  echo "Missing MULTISIG env variable"
  exit 1
fi

# cd to the directory of this script so that this can be run from anywhere
parent_path=$( cd "$(dirname "${BASH_SOURCE[0]}")" ; pwd -P )
# At this point we are in contracts/scripts
cd "$parent_path"

# At this point we are in contracts
cd ../

# Deploy Leaderboard Contract
CMD="forge script script/upgrade/LeaderboardUpgrade.sol:LeaderboardUpgrader \
    $OUTPUT_PATH \
    --rpc-url $RPC_URL \
    --private-key $DEPLOYER_PRIVATE_KEY \
    --broadcast \
    --sig \"run(string memory leaderboardDeploymentFilePath)\""

if [ -n "$ETHERSCAN_API_KEY" ]; then
    CMD+=" --etherscan-api-key $ETHERSCAN_API_KEY --verify"
else
    echo "Warning: ETHERSCAN_API_KEY not set. Skipping contract verification."
fi

forge_output=$(eval $CMD)

echo "$forge_output"

# Extract the leaderboard values from the output
leaderboard_proxy=$(echo "$forge_output" | awk '/0: address/ {print $3}')
leaderboard_implementation=$(echo "$forge_output" | awk '/1: address/ {print $3}')

# Use the extracted value to replace the leaderboard implementation in leaderboard.json and save it to a temporary file
jq --arg leaderboard_implementation "$leaderboard_implementation" '.addresses.implementation = $leaderboard_implementation' $OUTPUT_PATH > "$OUTPUT_PATH.temp"

# Replace the original file with the temporary file
mv "$OUTPUT_PATH.temp" $OUTPUT_PATH

# Delete the temporary file
rm -f "$OUTPUT_PATH.temp"

data=$(cast calldata "upgradeToAndCall(address,bytes)" $leaderboard_implementation 0x)

echo "Calldata: $data"

echo "The new Leaderboard Implementation is $leaderboard_implementation"

if [ "$MULTISIG" = false ]; then
  echo "Executing upgrade transaction"
  cast send $leaderboard_proxy "upgradeToAndCall(address,bytes)" $leaderboard_implementation 0x \
    --rpc-url $RPC_URL \
    --private-key $DEPLOYER_PRIVATE_KEY
else
  echo "You can propose the upgrade transaction with the multisig using this calldata"
  echo $data
fi