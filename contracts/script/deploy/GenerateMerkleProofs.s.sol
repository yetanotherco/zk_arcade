// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Script} from "forge-std/Script.sol";

contract GenerateMerkleProofs is Script {
    struct ProofData {
        address user;
        bytes32[] proof;
    }
    
    function run(string memory configFilePath, string memory outputFilePath) public {
        string memory configData = vm.readFile(configFilePath);
        
        address[] memory whitelistAddresses = 
            abi.decode(vm.parseJson(configData, ".whitelist.addresses"), (address[]));
        
        bytes32[] memory leaves = new bytes32[](whitelistAddresses.length);
        for (uint256 i = 0; i < whitelistAddresses.length; i++) {
            leaves[i] = keccak256(abi.encodePacked(whitelistAddresses[i]));
        }
        
        leaves = sortBytes32Array(leaves);
        
        string memory proofsJson = "[";
        for (uint256 i = 0; i < whitelistAddresses.length; i++) {
            bytes32 leaf = keccak256(abi.encodePacked(whitelistAddresses[i]));
            bytes32[] memory proof = generateProof(leaves, leaf);
            
            string memory proofStr = "[";
            for (uint256 j = 0; j < proof.length; j++) {
                proofStr = string(abi.encodePacked(proofStr, '"', vm.toString(proof[j]), '"'));
                if (j < proof.length - 1) {
                    proofStr = string(abi.encodePacked(proofStr, ","));
                }
            }
            proofStr = string(abi.encodePacked(proofStr, "]"));
            
            string memory addressProof = string(abi.encodePacked(
                '{"address":"', vm.toString(whitelistAddresses[i]), 
                '","proof":', proofStr, "}"
            ));
            
            proofsJson = string(abi.encodePacked(proofsJson, addressProof));
            if (i < whitelistAddresses.length - 1) {
                proofsJson = string(abi.encodePacked(proofsJson, ","));
            }
        }
        proofsJson = string(abi.encodePacked(proofsJson, "]"));
        
        string memory finalJson = string(abi.encodePacked('{"proofs":', proofsJson, "}"));
        vm.writeFile(outputFilePath, finalJson);        
    }
    
    function generateProof(bytes32[] memory leaves, bytes32 leaf) 
        internal 
        pure 
        returns (bytes32[] memory) 
    {
        uint256 n = leaves.length;
        require(n > 0, "Empty tree");
        
        uint256 index = type(uint256).max;
        for (uint256 i = 0; i < n; i++) {
            if (leaves[i] == leaf) {
                index = i;
                break;
            }
        }
        require(index != type(uint256).max, "Leaf not found");
        
        uint256 proofLength = 0;
        uint256 tempN = n;
        while (tempN > 1) {
            proofLength++;
            tempN = (tempN + 1) / 2;
        }
        
        bytes32[] memory proof = new bytes32[](proofLength);
        uint256 proofIndex = 0;
        
        bytes32[] memory currentLevel = new bytes32[](n);
        for (uint256 i = 0; i < n; i++) {
            currentLevel[i] = leaves[i];
        }
        
        uint256 currentIndex = index;
        uint256 currentN = n;
        
        while (currentN > 1) {
            uint256 siblingIndex = (currentIndex % 2 == 0) ? currentIndex + 1 : currentIndex - 1;
            
            if (siblingIndex < currentN) {
                proof[proofIndex] = currentLevel[siblingIndex];
            } else {
                proof[proofIndex] = currentLevel[currentIndex];
            }
            proofIndex++;
            
            bytes32[] memory nextLevel = new bytes32[]((currentN + 1) / 2);
            for (uint256 i = 0; i < currentN; i += 2) {
                bytes32 left = currentLevel[i];
                bytes32 right = (i + 1 < currentN) ? currentLevel[i + 1] : left;
                
                if (left <= right) {
                    nextLevel[i / 2] = keccak256(abi.encodePacked(left, right));
                } else {
                    nextLevel[i / 2] = keccak256(abi.encodePacked(right, left));
                }
            }
            
            currentLevel = nextLevel;
            currentIndex = currentIndex / 2;
            currentN = (currentN + 1) / 2;
        }
        
        return proof;
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
