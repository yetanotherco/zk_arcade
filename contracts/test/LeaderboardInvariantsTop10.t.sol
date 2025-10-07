// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.13;

import "forge-std/Test.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

import {Leaderboard} from "../src/Leaderboard.sol";
import {ZkArcadeNft} from "../src/ZkArcadeNft.sol";

contract AlwaysTrueFallback {
    fallback(bytes calldata) external payable returns (bytes memory) {
        return abi.encode(true);
    }
}

contract LeaderboardInvariants is Test {
    Leaderboard public leaderboard;
    ZkArcadeNft public nft;
    address nftOwner;
    address lbOwner;

    string internal constant LEADERBOARD_CONFIG_PATH = "script/deploy/config/devnet/leaderboard.json";
    string internal constant NFT_CONFIG_PATH = "script/deploy/config/devnet/nft.json";

    function setUp() public {
        // NFT
        string memory nftConfig = vm.readFile(NFT_CONFIG_PATH);

        nftOwner = vm.parseJsonAddress(nftConfig, ".permissions.owner");
        string memory nftName = vm.parseJsonString(nftConfig, ".name");
        string memory nftSymbol = vm.parseJsonString(nftConfig, ".symbol");
        string memory nftTokenURI = vm.parseJsonString(nftConfig, ".tokenURI");

        // deploy NFT implementation + proxy (initialize)
        ZkArcadeNft nftImpl = new ZkArcadeNft();
        bytes memory nftInit = abi.encodeWithSignature(
            "initialize(address,string,string,string)", nftOwner, nftName, nftSymbol, nftTokenURI
        );

        // Leaderboard
        string memory lbConfig = vm.readFile(LEADERBOARD_CONFIG_PATH);

        lbOwner = vm.parseJsonAddress(lbConfig, ".permissions.owner");
        // address alignedServiceManager = vm.parseJsonAddress(lbConfig, ".alignedServiceManager");
        address alignedServiceManager = address(new AlwaysTrueFallback());
        address alignedBatcherPayment = vm.parseJsonAddress(lbConfig, ".alignedBatcherPaymentService");

        bytes32 beastVkCommitment = vm.parseJsonBytes32(lbConfig, ".beastVKCommitment");
        bytes32 parityVkCommitment = vm.parseJsonBytes32(lbConfig, ".parityVKCommitment");
        bool useWhitelist = vm.parseJsonBool(lbConfig, ".useWhitelist");

        Leaderboard.BeastGame[] memory beastGames =
            abi.decode(vm.parseJson(lbConfig, ".games"), (Leaderboard.BeastGame[]));
        Leaderboard.ParityGame[] memory parityGames =
            abi.decode(vm.parseJson(lbConfig, ".parityGames"), (Leaderboard.ParityGame[]));

        Leaderboard lbImpl = new Leaderboard();
        bytes memory lbInit = abi.encodeWithSignature(
            "initialize(address,address,address,address,(uint256,uint256,uint256)[],(uint256,uint256,uint256)[],bool,bytes32,bytes32)",
            lbOwner,
            alignedServiceManager,
            alignedBatcherPayment,
            address(nftImpl),
            beastGames,
            parityGames,
            useWhitelist,
            beastVkCommitment,
            parityVkCommitment
        );

        ERC1967Proxy lbProxy = new ERC1967Proxy(address(lbImpl), lbInit);
        leaderboard = Leaderboard(address(lbProxy));

        ERC1967Proxy nftProxy = new ERC1967Proxy(address(nftImpl), nftInit);
        nft = ZkArcadeNft(address(nftProxy));

        (uint256 endsAtTime,, uint256 startsAtTime) = leaderboard.beastGames(0);
        uint256 t = block.timestamp;
        if (!(t >= startsAtTime && t < endsAtTime)) {
            vm.warp(startsAtTime + 1);
        }

        targetContract(address(this));
        bytes4[] memory sels = new bytes4[](1);
        sels[0] = this.exerciseClaimBeast.selector;
        FuzzSelector memory fs = FuzzSelector({addr: address(this), selectors: sels});
        targetSelector(fs);
    }

    /**
     * fuzzing: publicInputs = abi.encode(levelCompleted, gameConfig, userAddress)
     */
    function exerciseClaimBeast(address user, uint256 levelCompleted) public {
        if (user == address(0)) return;

        (Leaderboard.BeastGame memory g, uint256 gi) = leaderboard.getCurrentBeastGame();
        bytes32 gameHash = keccak256(abi.encodePacked(g.gameConfig));

        vm.startPrank(user);
        bytes memory publicInputs = abi.encode(levelCompleted, g.gameConfig, user);
        leaderboard.claimBeastPoints(gi, bytes32(0), publicInputs, bytes20(uint160(1337)), bytes32(0), "hello", 0);

        address[10] memory top = leaderboard.getTop10Score();
        for (uint256 i = 0; i + 1 < 10; i++) {
            uint256 si = leaderboard.getUserScore(top[i]);
            uint256 sj = leaderboard.getUserScore(top[i + 1]);
            require(si >= sj, "Top10 not sorted by score desc");
        }

        vm.stopPrank();
    }

    function test_ReplayInvariantSequence() public {
        vm.prank(address(0xF74086D86DC7465c8638C2bf2FFe5F99156a007d));
        _replayCall(
            address(0x3f2af4313d48B05cE0E1443afB9cd362eF246D61),
            68762223917237099721987601919631040396260878289091471443566946286910381097021
        );

        vm.prank(address(0x792f636F6E6669672F6465766E65742f6c656163));
        _replayCall(
            address(0x35F7e56283100657367bee6A576AB6FBB4626B06),
            113095901348036438778725622755337395562840851985585057432526069653893074389514
        );

        vm.prank(address(0xc68f87da551363D157Ca144252b595dac19205C3));
        _replayCall(
            address(0x00000000000000000000000000000000000001FE),
            97569884605916225051403212656556507955018248777258318895762758024193532305091
        );

        vm.prank(address(0x0000000000000000000000000000000000001eB8));
        _replayCall(
            address(0x48c73344D07DCBa60134B664446C43886bD40F13),
            97569884605916225051403212656556507955018248777258318895762758024193532305078
        );

        vm.prank(address(0x0000000000000000000000000000000000000B611744));
        _replayCall(
            address(0x19faA1F6A65045ba1303745f6b2AC70cD4960d90),
            35404662103700593694578830235870565781990028357102614449916780133448209753188
        );

        vm.prank(address(0xB1000165908Ca2e45792e587EE21d443df1eA43a));
        _replayCall(
            address(0x0000000000000000000000000000000000000EF4),
            38878206584692966203415385907871375197469080758325516314230789535345649042548
        );

        vm.prank(address(0xDbeD9fD22C7F288E4462AadD5C3FA7525f54Fcc6));
        _replayCall(
            address(0xE0A4E05BAe3945B174a236eD024DC39c7a9b1d0f),
            103985164339132348536331515838524171160633850330632249984417901071506612646964
        );

        vm.prank(address(0xE2265388EDa5526EbD0De9Af0d7eAb7740E2a7F9));
        _replayCall(
            address(0x0000000000000000000000000000000000001a80),
            84800337471693920904250232874319843718400766719524250287777680170677855896595
        );

        vm.prank(address(0x93fba18573F876819ed67d80e886Bec26346708E));
        _replayCall(
            address(0x4eD0D258a98bbfA170f3517B5C9DcfA3906690e6),
            115792089237316195423570985008687907853269984665640564039457584007913129639934
        );

        vm.prank(address(0x9dAF3d2a14074e578514aB29bdD3AD9A9E09Fe44));
        _replayCall(
            address(0xf99215398d7dEe96078aaaE7f3ddbB242e038a09),
            115792089237316195423570985008687907853269984665640564039457584007913129639932
        );

        vm.prank(address(0x0000000000000000000000000000000000001daB));
        _replayCall(
            address(0x19faA1F6A65045ba1303745f6b2AC70cD4960d90),
            64046201084306817909407616932319064499704659404937170639108232801038830852066
        );

        // finally recheck invariant here to see the same revert locally
        address[10] memory top = leaderboard.getTop10Score();
        for (uint256 i = 0; i + 1 < 10; i++) {
            uint256 si = leaderboard.getUserScore(top[i]);
            uint256 sj = leaderboard.getUserScore(top[i + 1]);
            console.log("si: ", si, " >= sj: ", sj);
            require(si >= sj, "Top10 not sorted by score desc");
        }
    }

    function _replayCall(address user, uint256 levelCompleted) internal {
        if (user == address(0)) return;
        (Leaderboard.BeastGame memory g, uint256 gi) = leaderboard.getCurrentBeastGame();

        vm.prank(user);
        bytes memory publicInputs = abi.encode(levelCompleted, g.gameConfig, user);
        leaderboard.claimBeastPoints(gi, bytes32(0), publicInputs, bytes20(uint160(1337)), bytes32(0), "hello", 0);
    }

    // CRASHED
    function invariant_Top10SortedByScoreDesc() public {
        address[10] memory top = leaderboard.getTop10Score();
        for (uint256 i = 0; i + 1 < 10; i++) {
            uint256 si = leaderboard.getUserScore(top[i]);
            uint256 sj = leaderboard.getUserScore(top[i + 1]);
            require(si >= sj, "Top10 not sorted by score desc");
        }
    }
}
