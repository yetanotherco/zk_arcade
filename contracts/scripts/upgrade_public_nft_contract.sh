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

# Deploy Public NFT Upgrader Contract
CMD="forge script script/upgrade/PublicNftUpgrade.sol:PublicNftUpgrader \
    $PUBLIC_NFT_OUTPUT_PATH \
    --rpc-url $RPC_URL \
    --private-key $DEPLOYER_PRIVATE_KEY \
    --broadcast \
    --sig \"run(string memory nftDeploymentFilePath)\""

if [ -n "$ETHERSCAN_API_KEY" ]; then
    CMD+=" --etherscan-api-key $ETHERSCAN_API_KEY --verify"
else
    echo "Warning: ETHERSCAN_API_KEY not set. Skipping contract verification."
fi

forge_output=$(eval $CMD)

echo "$forge_output"

# Extract the nft values from the output
nft_proxy=$(echo "$forge_output" | awk '/0: address/ {print $3}')
nft_implementation=$(echo "$forge_output" | awk '/1: address/ {print $3}')

# Use the extracted value to replace the nft implementation in nft.json and save it to a temporary file
jq --arg nft_implementation "$nft_implementation" '.addresses.implementation = $nft_implementation' $PUBLIC_NFT_OUTPUT_PATH > "$PUBLIC_NFT_OUTPUT_PATH.temp"

# Replace the original file with the temporary file
mv "$PUBLIC_NFT_OUTPUT_PATH.temp" $PUBLIC_NFT_OUTPUT_PATH

# Delete the temporary file
rm -f "$PUBLIC_NFT_OUTPUT_PATH.temp"

data=$(cast calldata "upgradeToAndCall(address,bytes)" $nft_implementation 0x)

echo "Calldata: $data"

echo "The new NFT Implementation is $nft_implementation"

if [ "$MULTISIG" = false ]; then
  echo "Executing upgrade transaction"
  cast send $nft_proxy "upgradeToAndCall(address,bytes)" $nft_implementation 0x \
    --rpc-url $RPC_URL \
    --private-key $DEPLOYER_PRIVATE_KEY
else
  echo "You can propose the upgrade transaction with the multisig using this calldata"
  echo $data
fi
