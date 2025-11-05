#!/bin/bash

# cd to the directory of this script so that this can be run from anywhere
parent_path=$( cd "$(dirname "${BASH_SOURCE[0]}")" ; pwd -P )
# At this point we are in contracts/scripts/
cd "$parent_path"

# cd to contracts/
cd ..

# Deploy NFT Contract
CMD="forge script script/deploy/NftContractDeployer.s.sol:NftContractDeployer \
    $NFT_CONFIG_PATH \
    $NFT_OUTPUT_PATH \
    --rpc-url $RPC_URL \
    --private-key $DEPLOYER_PRIVATE_KEY \
    --broadcast --slow \
    --sig \"run(string memory configPath, string memory outputPath) \""

if [ -n "$ETHERSCAN_API_KEY" ]; then
    CMD+=" --etherscan-api-key $ETHERSCAN_API_KEY --verify"
else
    echo "Warning: ETHERSCAN_API_KEY not set. Skipping contract verification."
fi

eval $CMD

# Print the deployed contract address
nft_contract_proxy=$(jq -r '.addresses.proxy' $NFT_OUTPUT_PATH)
echo "NFT Contract Proxy Address: $nft_contract_proxy"
nft_contract_implementation=$(jq -r '.addresses.implementation' $NFT_OUTPUT_PATH)
echo "NFT Contract Implementation Address: $nft_contract_implementation"

# Deploy Public NFT Contract
CMD="forge script script/deploy/PublicNftContractDeployer.s.sol:PublicNftContractDeployer \
    $PUBLIC_NFT_CONFIG_PATH \
    $PUBLIC_NFT_OUTPUT_PATH \
    --rpc-url $RPC_URL \
    --private-key $DEPLOYER_PRIVATE_KEY \
    --broadcast --slow \
    --sig \"run(string memory configPath, string memory outputPath) \""

if [ -n "$ETHERSCAN_API_KEY" ]; then
    CMD+=" --etherscan-api-key $ETHERSCAN_API_KEY --verify"
else
    echo "Warning: ETHERSCAN_API_KEY not set. Skipping contract verification."
fi

eval $CMD

# Print the deployed contract address
nft_contract_proxy=$(jq -r '.addresses.proxy' $PUBLIC_NFT_OUTPUT_PATH)
echo "NFT Contract Proxy Address: $nft_contract_proxy"
nft_contract_implementation=$(jq -r '.addresses.implementation' $PUBLIC_NFT_OUTPUT_PATH)
echo "NFT Contract Implementation Address: $nft_contract_implementation"

# Call enableMinting on Public NFT Contract to enable public minting
cast send $nft_contract_proxy "enableMinting()" --rpc-url $RPC_URL --private-key $DEPLOYER_PRIVATE_KEY
