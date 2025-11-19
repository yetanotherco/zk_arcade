// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;
import { ZkArcadePublicNft } from "../../src/ZkArcadePublicNft.sol";

import "forge-std/Script.sol";
import "forge-std/StdJson.sol";

contract PublicNftUpgrader is Script {
    function run(
        string memory nftDeploymentFilePath
    ) external returns (address, address) {

        string memory nft_deployment_file = vm.readFile(
            nftDeploymentFilePath
        );

        vm.startBroadcast();

        ZkArcadePublicNft NftProxy = ZkArcadePublicNft(payable(
            stdJson.readAddress(
                nft_deployment_file,
                ".addresses.proxy"
            ))
        );

        ZkArcadePublicNft newNftImplementation = new ZkArcadePublicNft();

        // Not link the new implementation to the proxy
        // Because this must be executed in the multisig
        
        vm.stopBroadcast();

        return (address(NftProxy), address(newNftImplementation));
    }
}
