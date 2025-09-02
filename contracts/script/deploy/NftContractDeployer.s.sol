// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {ZkArcadeNft} from "../../src/ZkArcadeNft.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {Script} from "forge-std/Script.sol";

contract NftContractDeployer is Script {
    function run(string memory configFilePath, string memory outputFilePath, bytes32 merkleRoot)
        public
        returns (address _proxy, address _implementation)
    {
        string memory configData = vm.readFile(configFilePath);

        address owner = vm.parseJsonAddress(configData, ".permissions.owner");
        string memory name = vm.parseJsonString(configData, ".name");
        string memory symbol = vm.parseJsonString(configData, ".symbol");

        address[] memory whitelistAddresses = 
            abi.decode(vm.parseJson(configData, ".whitelist.addresses"), (address[]));

        vm.startBroadcast();
        ZkArcadeNft implementation = new ZkArcadeNft();
        bytes memory data = abi.encodeWithSignature(
            "initialize(address,string,string,bytes32)", 
            owner, 
            name, 
            symbol,
            merkleRoot
        );
        ERC1967Proxy proxy = new ERC1967Proxy(address(implementation), data);
        vm.stopBroadcast();

        // Write addresses and merkle data
        string memory addressesObj = "addresses";
        vm.serializeAddress(addressesObj, "proxy", address(proxy));
        string memory addressOutput = vm.serializeAddress(addressesObj, "implementation", address(implementation));
        
        string memory merkleObj = "merkle";
        vm.serializeBytes32(merkleObj, "root", merkleRoot);
        string memory merkleOutput = vm.serializeUint(merkleObj, "whitelistCount", whitelistAddresses.length);
        
        string memory parentObj = "parent";
        vm.serializeString(parentObj, "addresses", addressOutput);
        string memory finalJson = vm.serializeString(parentObj, "merkle", merkleOutput);

        vm.writeFile(outputFilePath, finalJson);

        return (address(proxy), address(implementation));
    }
}
