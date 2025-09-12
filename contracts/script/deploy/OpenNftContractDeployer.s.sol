// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {ZkArcadePublicNft} from "../../src/ZkArcadePublicNft.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {Script} from "forge-std/Script.sol";

contract OpenNftContractDeployer is Script {
    function run(string memory configFilePath, string memory outputFilePath)
        public
        returns (address _proxy, address _implementation)
    {
        string memory configData = vm.readFile(configFilePath);

        address owner = vm.parseJsonAddress(configData, ".permissions.owner");
        string memory name = vm.parseJsonString(configData, ".name");
        string memory symbol = vm.parseJsonString(configData, ".symbol");
        string memory tokenURI = vm.parseJsonString(configData, ".tokenURI");
        uint256 maxSupply = vm.parseJsonUint(configData, ".maxSupply");

        vm.startBroadcast();
        ZkArcadePublicNft implementation = new ZkArcadePublicNft();
        bytes memory data = abi.encodeWithSignature(
            "initialize(address,string,string,string,uint256)", owner, name, symbol, tokenURI, maxSupply
        );
        ERC1967Proxy proxy = new ERC1967Proxy(address(implementation), data);
        vm.stopBroadcast();

        // Write addresses and config data
        string memory addressesObj = "addresses";
        vm.serializeAddress(addressesObj, "proxy", address(proxy));
        string memory addressOutput = vm.serializeAddress(addressesObj, "implementation", address(implementation));

        string memory configObj = "config";
        vm.serializeString(configObj, "name", name);
        vm.serializeString(configObj, "symbol", symbol);
        vm.serializeString(configObj, "tokenURI", tokenURI);
        string memory configOutput = vm.serializeUint(configObj, "maxSupply", maxSupply);

        string memory parentObj = "parent";
        vm.serializeString(parentObj, "addresses", addressOutput);
        string memory finalJson = vm.serializeString(parentObj, "config", configOutput);

        vm.writeFile(outputFilePath, finalJson);

        return (address(proxy), address(implementation));
    }
}