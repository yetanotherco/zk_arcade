// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {ZkArcadeNft} from "../../src/ZkArcadeNft.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {Script} from "forge-std/Script.sol";

contract NftContractDeployer is Script {
    function run(string memory configFilePath, string memory outputFilePath)
        public
        returns (address _proxy, address _implementation)
    {
        string memory configData = vm.readFile(configFilePath);

        address owner = vm.parseJsonAddress(configData, ".permissions.owner");
        string memory name = vm.parseJsonString(configData, ".name");
        string memory symbol = vm.parseJsonString(configData, ".symbol");

        address[] memory whitelistAddresses = 
            abi.decode(vm.parseJson(configData, ".whitelist.addresses"), (address[]));
                
        bytes32 merkleRoot = generateMerkleRoot(whitelistAddresses);

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

    // Analyze if its better to generate the merkle root off-chain instead.
    function generateMerkleRoot(address[] memory addresses) internal pure returns (bytes32) {
        require(addresses.length > 0, "Empty whitelist");
        
        bytes32[] memory leaves = new bytes32[](addresses.length);
        for (uint256 i = 0; i < addresses.length; i++) {
            leaves[i] = keccak256(abi.encodePacked(addresses[i]));
        }
        
        leaves = sortBytes32Array(leaves);
        
        return buildMerkleTree(leaves);
    }
    
    function buildMerkleTree(bytes32[] memory leaves) internal pure returns (bytes32) {
        uint256 n = leaves.length;
        
        while (n > 1) {
            uint256 k = 0;
            for (uint256 i = 0; i < n; i += 2) {
                bytes32 left = leaves[i];
                bytes32 right = (i + 1 < n) ? leaves[i + 1] : left;
                
                if (left <= right) {
                    leaves[k] = keccak256(abi.encodePacked(left, right));
                } else {
                    leaves[k] = keccak256(abi.encodePacked(right, left));
                }
                k++;
            }
            n = k;
        }
        
        return leaves[0];
    }
    
    function sortBytes32Array(bytes32[] memory arr) internal pure returns (bytes32[] memory) {
        uint256 n = arr.length;
        
        for (uint256 i = 0; i < n - 1; i++) {
            for (uint256 j = 0; j < n - i - 1; j++) {
                if (arr[j] > arr[j + 1]) {
                    bytes32 temp = arr[j];
                    arr[j] = arr[j + 1];
                    arr[j + 1] = temp;
                }
            }
        }
        
        return arr;
    }
}
