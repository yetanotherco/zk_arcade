// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;
import {ZkArcadeNft} from "../../src/ZkArcadeNft.sol";

import "forge-std/Script.sol";
import "forge-std/StdJson.sol";

contract NftUpgrader is Script {
    function run(
        string memory nftDeploymentFilePath
    ) external returns (address, address) {

        string memory nft_deployment_file = vm.readFile(
            nftDeploymentFilePath
        );

        vm.startBroadcast();

        ZkArcadeNft NftProxy = ZkArcadeNft(payable(
            stdJson.readAddress(
                nft_deployment_file,
                ".addresses.proxy"
            ))
        );

        ZkArcadeNft newNftImplementation = new ZkArcadeNft();

        // Not link the new implementation to the proxy
        // Because this must be executed in the multisig
        
        vm.stopBroadcast();

        return (address(NftProxy), address(newNftImplementation));
    }
}