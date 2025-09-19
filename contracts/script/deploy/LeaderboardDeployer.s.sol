// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Leaderboard} from "../../src/Leaderboard.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

import {Script} from "forge-std/Script.sol";

contract LeaderboardDeployer is Script {
    function run(string memory configFilePath, string memory outputFilePath)
        public
        returns (address _proxy, address _implementation)
    {
        string memory configData = vm.readFile(configFilePath);

        address owner = vm.parseJsonAddress(configData, ".permissions.owner");
        address alignedServiceManagerAddress = vm.parseJsonAddress(configData, ".alignedServiceManager");
        address alignedBatcherPaymentAddress = vm.parseJsonAddress(configData, ".alignedBatcherPaymentService");
        address zkArcadeNftContract = vm.parseJsonAddress(configData, ".zkArcadeNftContract");
        bytes32 beastVkCommitment = vm.parseJsonBytes32(configData, ".beastVKCommitment");
        bytes32 parityVKCommitment = vm.parseJsonBytes32(configData, ".parityVKCommitment");

        Leaderboard.BeastGame[] memory beastGames =
            abi.decode(vm.parseJson(configData, ".games"), (Leaderboard.BeastGame[]));

        Leaderboard.ParityGame[] memory parityGames =
            abi.decode(vm.parseJson(configData, ".parityGames"), (Leaderboard.ParityGame[]));

        bool useWhitelist = vm.parseJsonBool(configData, ".useWhitelist");

        vm.startBroadcast();
        Leaderboard implementation = new Leaderboard();
        bytes memory data = abi.encodeWithSignature(
            "initialize(address,address,address,address,(uint256,uint256,uint256)[],(uint256,uint256,uint256)[],bool,bytes32,bytes32)",
            owner,
            alignedServiceManagerAddress,
            alignedBatcherPaymentAddress,
            zkArcadeNftContract,
            beastGames,
            parityGames,
            useWhitelist,
            beastVkCommitment,
            parityVKCommitment
        );
        ERC1967Proxy proxy = new ERC1967Proxy(address(implementation), data);
        vm.stopBroadcast();

        // Write addresses
        string memory addressesObj = "addresses";
        vm.serializeAddress(addressesObj, "proxy", address(proxy));
        string memory output = vm.serializeAddress(addressesObj, "implementation", address(implementation));
        string memory finalJson = vm.serializeString("parent", addressesObj, output);

        vm.writeFile(outputFilePath, finalJson);

        return (address(proxy), address(implementation));
    }
}
