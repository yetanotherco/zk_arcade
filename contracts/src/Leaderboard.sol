// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

contract Leaderboard is UUPSUpgradeable, OwnableUpgradeable {
    // ======== Storage ========
    // == General ==
    address public alignedServiceManager;
    address public alignedBatcherPaymentService;
    address[10] public top10Score;
    mapping(address => uint256) public usersScore;

    // == Beast storages ==
    struct BeastGame {
        uint256 endsAtTime;
        uint256 gameConfig;
        uint256 startsAtTime;
    }

    BeastGame[] public beastGames;
    /// See `getBeastKey` to see the key implementation
    mapping(bytes32 => uint256) public usersBeastLevelCompleted;

    function getBeastKey(address user, uint256 game) internal pure returns (bytes32) {
        bytes32 gameHash = keccak256(abi.encodePacked(game));
        return keccak256(abi.encodePacked(user, gameHash));
    }

    /**
     * Errors
     */
    error CallToAlignedContractFailed();
    error ProofNotVerifiedOnAligned();
    error UserHasAlreadyCompletedThisLevel(uint256 level);
    error UserAddressMismatch(address expected, address actual);
    error InvalidGame(uint256 expected, uint256 provided);
    error NoActiveBeastGame();

    /**
     * Events
     */
    event NewSolutionSubmitted(address user, uint256 level);

    constructor() {
        _disableInitializers();
    }

    function initialize(
        address owner,
        address _alignedServiceManager,
        address _alignedBatcherPaymentService,
        BeastGame[] calldata _beastGames
    ) public initializer {
        alignedServiceManager = _alignedServiceManager;
        alignedBatcherPaymentService = _alignedBatcherPaymentService;
        beastGames = _beastGames;
        __Ownable_init(owner);
        __UUPSUpgradeable_init();
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    function setBeastGames(BeastGame[] calldata _beastGames) public onlyOwner {
        beastGames = _beastGames;
    }

    function submitBeastSolution(
        bytes32 proofCommitment,
        bytes calldata publicInputs,
        bytes32 provingSystemAuxDataCommitment,
        bytes20 proofGeneratorAddr,
        bytes32 batchMerkleRoot,
        bytes memory merkleProof,
        uint256 verificationDataBatchIndex
    ) public {
        (uint256 levelCompleted, uint256 gameConfig, address userAddress) =
            abi.decode(publicInputs, (uint256, uint256, address));

        if (userAddress != msg.sender) {
            revert UserAddressMismatch({expected: userAddress, actual: msg.sender});
        }

        bytes32 pubInputCommitment = keccak256(abi.encodePacked(publicInputs));
        (bool callWasSuccessful, bytes memory proofIsIncluded) = alignedServiceManager.staticcall(
            abi.encodeWithSignature(
                "verifyBatchInclusion(bytes32,bytes32,bytes32,bytes20,bytes32,bytes,uint256,address)",
                proofCommitment,
                pubInputCommitment,
                provingSystemAuxDataCommitment,
                proofGeneratorAddr,
                batchMerkleRoot,
                merkleProof,
                verificationDataBatchIndex,
                alignedBatcherPaymentService
            )
        );

        if (!callWasSuccessful) {
            revert CallToAlignedContractFailed();
        }

        bool proofIncluded = abi.decode(proofIsIncluded, (bool));
        if (!proofIncluded) {
            revert ProofNotVerifiedOnAligned();
        }

        // Validate the game is available and the config is correct
        BeastGame memory currentGame = getCurrentBeastGame();
        if (currentGame.gameConfig != gameConfig) {
            revert InvalidGame(currentGame.gameConfig, gameConfig);
        }

        bytes32 key = getBeastKey(msg.sender, gameConfig);
        uint256 currentLevelCompleted = usersBeastLevelCompleted[key];
        if (levelCompleted <= currentLevelCompleted) {
            revert UserHasAlreadyCompletedThisLevel(currentLevelCompleted);
        }
        usersBeastLevelCompleted[key] = levelCompleted;

        usersScore[msg.sender] += levelCompleted - currentLevelCompleted;

        verifyAndReplaceInTop10(msg.sender);

        emit NewSolutionSubmitted(msg.sender, levelCompleted);
    }

    function getUserScore(address user) public view returns (uint256) {
        return usersScore[user];
    }

    function getUserBeastLevelCompleted(bytes32 key) public view returns (uint256) {
        return usersBeastLevelCompleted[key];
    }

    function getCurrentBeastGame() public view returns (BeastGame memory) {
        for (uint256 i = 0; i < beastGames.length; i++) {
            if (block.timestamp >= beastGames[i].startsAtTime && block.timestamp < beastGames[i].endsAtTime) {
                return beastGames[i];
            }
        }

        revert NoActiveBeastGame();
    }

    function getTop10Score() external view returns (address[10] memory) {
        return top10Score;
    }

    function verifyAndReplaceInTop10(address user) internal {
        uint256 userScore = usersScore[user];

        // early return to not run the whole alg if the user does not have enough points to be in the top 10
        if (userScore <= usersScore[top10Score[9]]) {
            return;
        }

        int256 existingIndex = -1;
        int256 insertIndex = -1;
        for (uint256 i = 0; i < 10; i++) {
            address addr = top10Score[i];

            if (addr == user) {
                existingIndex = int256(i);
            }

            if (insertIndex == -1 && userScore > usersScore[addr]) {
                insertIndex = int256(i);
            }
        }

        if (insertIndex == -1 || (existingIndex != -1 && existingIndex <= insertIndex)) {
            return;
        }

        // If the user is already in the leaderboard
        // shift all the elements from the insert place to existing
        if (existingIndex != -1) {
            for (uint256 i = uint256(existingIndex); i > uint256(insertIndex); i--) {
                top10Score[i] = top10Score[i - 1];
            }
        } else {
            // else (if not present already), simply shift down all the elements from the insert index
            for (uint256 j = 9; j > uint256(insertIndex); j--) {
                top10Score[j] = top10Score[j - 1];
            }
        }

        top10Score[uint256(insertIndex)] = user;
    }
}
