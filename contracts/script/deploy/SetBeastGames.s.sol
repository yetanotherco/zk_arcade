// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.12;

import {Leaderboard} from "../../src/Leaderboard.sol";

import "forge-std/Script.sol";
import "forge-std/StdJson.sol";

contract SetBeastGames is Script {
    function run(string memory configFilePath, string memory leaderboardDeploymentFilePath) external {
        string memory configData = vm.readFile(configFilePath);
        string memory leaderboard_deployment_file = vm.readFile(leaderboardDeploymentFilePath);

        address proxyAddress = stdJson.readAddress(leaderboard_deployment_file, ".addresses.proxy");

        Leaderboard.BeastGame[] memory beastGames =
            abi.decode(vm.parseJson(configData, ".games"), (Leaderboard.BeastGame[]));

        vm.startBroadcast();

        Leaderboard leaderboard = Leaderboard(proxyAddress);
        leaderboard.setBeastGames(beastGames);

        vm.stopBroadcast();
    }
}
