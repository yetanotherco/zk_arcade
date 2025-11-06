// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {ZkArcadePublicNft} from "../../src/ZkArcadePublicNft.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {Script} from "forge-std/Script.sol";

contract PublicNftContractDeployer is Script {
    function run(string memory configFilePath, string memory outputFilePath)
        public
        returns (address _proxy, address _implementation)
    {
        string memory configData = vm.readFile(configFilePath);

        address owner = vm.parseJsonAddress(configData, ".permissions.owner");
        string memory name = vm.parseJsonString(configData, ".name");
        string memory symbol = vm.parseJsonString(configData, ".symbol");
        string memory tokenURI = vm.parseJsonString(configData, ".tokenURI");
        uint256 totalSupply = vm.parseJsonUint(configData, ".totalSupply");
        address mintingFundsRecipient = vm.parseJsonAddress(
            configData,
            ".permissions.mintingFundsRecipient"
        );

        vm.startBroadcast();
        ZkArcadePublicNft implementation = new ZkArcadePublicNft();
        bytes memory data = abi.encodeCall(
            ZkArcadePublicNft.initialize,
            (owner, name, symbol, tokenURI, totalSupply, mintingFundsRecipient)
        );
        ERC1967Proxy proxy = new ERC1967Proxy(address(implementation), data);
        vm.stopBroadcast();

        // Write addresses
        string memory addressesObj = "addresses";
        vm.serializeAddress(addressesObj, "proxy", address(proxy));
        string memory addressOutput = vm.serializeAddress(addressesObj, "implementation", address(implementation));

        string memory parentObj = "parent";
        string memory finalJson = vm.serializeString(parentObj, "addresses", addressOutput);

        vm.writeFile(outputFilePath, finalJson);

        return (address(proxy), address(implementation));
    }
}
