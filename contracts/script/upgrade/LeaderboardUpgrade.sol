// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.12;
import {Leaderboard} from "../../src/Leaderboard.sol";

import "forge-std/Script.sol";
import "forge-std/StdJson.sol";

contract LeaderboardUpgrader is Script {
    function run(
        string memory leaderboardDeploymentFilePath
    ) external returns (address, address) {

        string memory leaderboard_deployment_file = vm.readFile(
            leaderboardDeploymentFilePath
        );

        vm.startBroadcast();

        Leaderboard LeaderboardProxy = Leaderboard(payable(
            stdJson.readAddress(
                leaderboard_deployment_file,
                ".addresses.proxy"
            ))
        );

        Leaderboard newLeaderboardImplementation = new Leaderboard();

        // Not link the new implementation to the proxy
        // Because this must be executed in the multisig
        
        vm.stopBroadcast();

        return (address(LeaderboardProxy), address(newLeaderboardImplementation));
    }
}
