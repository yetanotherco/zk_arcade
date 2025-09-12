// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {ZkArcadeNft} from "./ZkArcadeNft.sol";
import {ZkArcadePublicNft} from "./ZkArcadePublicNft.sol";

contract Leaderboard is UUPSUpgradeable, OwnableUpgradeable {
    // ======== Storage ========
    address public alignedServiceManager;
    address public alignedBatcherPaymentService;
    address[10] public top10Score;
    mapping(address => uint256) public usersScore;
    
    struct BeastGame {
        uint256 endsAtTime;
        uint256 gameConfig;
        uint256 startsAtTime;
    }

    BeastGame[] public beastGames;
    /// See `getBeastKey` to see the key implementation
    mapping(bytes32 => uint256) public usersBeastLevelCompleted;

    struct ParityGame {
        uint256 endsAtTime;
        uint256 gameConfig;
        uint256 startsAtTime;
    }

    ParityGame[] public parityGames;
    /// See `getParityKey` to see the key implementation
    mapping(bytes32 => uint256) public usersParityLevelCompleted;

    bytes32 beastVkCommitment;
    bytes32 parityVkCommitment;

    function getBeastKey(address user, uint256 game) internal pure returns (bytes32) {
        bytes32 gameHash = keccak256(abi.encodePacked(game));
        return keccak256(abi.encodePacked(user, gameHash));
    }

    function getParityKey(address user, uint256 gameConfig) internal pure returns (bytes32) {
        bytes32 gameHash = keccak256(abi.encodePacked(gameConfig));
        return keccak256(abi.encodePacked(user, gameHash));
    }

    address public zkArcadeNft;
    address public zkArcadePublicNft;
    bool public useWhitelist;

    /**
     * Errors
     */
    error CallToAlignedContractFailed();
    error ProofNotVerifiedOnAligned();
    error UserHasAlreadyCompletedThisLevel(uint256 level);
    error UserAddressMismatch(address expected, address actual);
    error UserIsNotWhitelisted(address);
    error InvalidGame(uint256 expected, uint256 provided);
    error NoActiveBeastGame();
    error NoActiveParityGame();
    error GameEnded();

    /**
     * Events
     */
    event NewSolutionSubmitted(address user, uint256 level, uint256 score);
    event BeastProgramIdUpdated(bytes32 newProgramId);
    event ParityProgramIdUpdated(bytes32 newProgramId);

    constructor() {
        _disableInitializers();
    }

    function initialize(
        address owner,
        address _alignedServiceManager,
        address _alignedBatcherPaymentService,
        address _zkArcadeNft,
        address _zkArcadePublicNft,
        BeastGame[] calldata _beastGames,
        ParityGame[] calldata _parityGames,
        bool _useWhitelist,
        bytes32 _beastVkCommitment,
        bytes32 _parityVkCommitment
    ) public initializer {
        alignedServiceManager = _alignedServiceManager;
        alignedBatcherPaymentService = _alignedBatcherPaymentService;
        beastGames = _beastGames;
        zkArcadeNft = _zkArcadeNft;
        zkArcadePublicNft = _zkArcadePublicNft;
        useWhitelist = _useWhitelist;
        parityGames = _parityGames;
        beastVkCommitment = _beastVkCommitment;
        parityVkCommitment = _parityVkCommitment;
        __Ownable_init(owner);
        __UUPSUpgradeable_init();
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    /// @notice Sets the beast games configuration
    /// @param _beastGames The new beast games configuration
    function setBeastGames(BeastGame[] calldata _beastGames) public onlyOwner {
        beastGames = _beastGames;
    }

    /// @notice Sets whether to use the whitelist or not
    /// @param _useWhitelist The new whitelist status
    function setUseWhitelist(bool _useWhitelist) public onlyOwner {
        useWhitelist = _useWhitelist;
    }

    /// @notice Sets the zkArcadeNft address
    /// @param nftContractAddress The new zkArcadeNft address
    function setZkArcadeNftAddress(address nftContractAddress) public onlyOwner {
        zkArcadeNft = nftContractAddress;
    }

    /// @notice Sets the zkArcadePublicNft address
    /// @param nftContractAddress The new zkArcadePublicNft address
    function setZkArcadePublicNftAddress(address nftContractAddress) public onlyOwner {
        zkArcadePublicNft = nftContractAddress;
    }

    /// @notice Sets the parity games configuration
    /// @param _parityGames The new parity games configuration
    function setParityGames(ParityGame[] calldata _parityGames) public onlyOwner {
        parityGames = _parityGames;
    }

    /// @notice Adds new parity games configuration
    /// @param _newParityGames The new parity games configuration to add
    function addParityGames(ParityGame[] calldata _newParityGames) public onlyOwner {
        for (uint256 i = 0; i < _newParityGames.length; i++) {
            parityGames.push(_newParityGames[i]);
        }
    }

    function submitBeastSolution(
        uint256 gameIndex,
        bytes32 proofCommitment,
        bytes calldata publicInputs,
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

        if (useWhitelist && !_isUserWhitelisted(userAddress)) {
            revert UserIsNotWhitelisted(userAddress);
        }

        bytes32 pubInputCommitment = keccak256(abi.encodePacked(publicInputs));
        (bool callWasSuccessful, bytes memory proofIsIncluded) = alignedServiceManager.staticcall(
            abi.encodeWithSignature(
                "verifyBatchInclusion(bytes32,bytes32,bytes32,bytes20,bytes32,bytes,uint256,address)",
                proofCommitment,
                pubInputCommitment,
                beastVkCommitment,
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
        BeastGame memory game = beastGames[gameIndex];
        if (block.timestamp >= game.endsAtTime) {
            revert GameEnded();
        }
        if (game.gameConfig != gameConfig) {
            revert InvalidGame(game.gameConfig, gameConfig);
        }

        bytes32 key = getBeastKey(msg.sender, gameConfig);
        uint256 currentLevelCompleted = usersBeastLevelCompleted[key];
        if (levelCompleted <= currentLevelCompleted) {
            revert UserHasAlreadyCompletedThisLevel(currentLevelCompleted);
        }
        usersBeastLevelCompleted[key] = levelCompleted;

        usersScore[msg.sender] += levelCompleted - currentLevelCompleted;

        verifyAndReplaceInTop10(msg.sender);

        emit NewSolutionSubmitted(msg.sender, levelCompleted, usersScore[msg.sender]);
    }

    function submitParitySolution(
        uint256 gameIndex,
        bytes32 proofCommitment,
        bytes calldata publicInputs,
        bytes20 proofGeneratorAddr,
        bytes32 batchMerkleRoot,
        bytes memory merkleProof,
        uint256 verificationDataBatchIndex
    ) public {
        (uint256 levelCompleted, uint256 gameConfig, uint256 userAddressNum) =
            abi.decode(publicInputs, (uint256, uint256, uint256));

        address userAddress = address(uint160(userAddressNum));

        if (userAddress != msg.sender) {
            revert UserAddressMismatch({expected: userAddress, actual: msg.sender});
        }

        if (useWhitelist && !_isUserWhitelisted(userAddress)) {
            revert UserIsNotWhitelisted(userAddress);
        }

        bytes32 pubInputCommitment = keccak256(publicInputs);
        (bool callWasSuccessful, bytes memory proofIsIncluded) = alignedServiceManager.staticcall(
            abi.encodeWithSignature(
                "verifyBatchInclusion(bytes32,bytes32,bytes32,bytes20,bytes32,bytes,uint256,address)",
                proofCommitment,
                pubInputCommitment,
                parityVkCommitment,
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

        ParityGame memory currentGame = parityGames[gameIndex];
        if (block.timestamp >= currentGame.endsAtTime) {
            revert GameEnded();
        }

        // The prover only commits the game config up to the level it reached
        // So we shift to compare only that part
        // Each level takes 10 bytes -> 80 bits
        uint256 shiftAmount = 256 - (80 * (levelCompleted));
        uint256 currentGameConfigUntil = currentGame.gameConfig >> shiftAmount;
        uint256 gameConfigUntil = gameConfig >> shiftAmount;

        if (currentGameConfigUntil != gameConfigUntil) {
            revert InvalidGame(currentGame.gameConfig, gameConfig);
        }

        bytes32 key = getParityKey(msg.sender, currentGame.gameConfig);
        uint256 currentLevelCompleted = usersParityLevelCompleted[key];
        if (levelCompleted <= currentLevelCompleted) {
            revert UserHasAlreadyCompletedThisLevel(currentLevelCompleted);
        }
        usersParityLevelCompleted[key] = levelCompleted;

        usersScore[msg.sender] += levelCompleted - currentLevelCompleted;

        verifyAndReplaceInTop10(msg.sender);

        emit NewSolutionSubmitted(msg.sender, levelCompleted, usersScore[msg.sender]);
    }

    function getUserScore(address user) public view returns (uint256) {
        return usersScore[user];
    }

    function getUserBeastLevelCompleted(bytes32 key) public view returns (uint256) {
        return usersBeastLevelCompleted[key];
    }

    function getCurrentBeastGame() public view returns (BeastGame memory, uint256 idx) {
        for (uint256 i = beastGames.length - 1; i >= 0; i--) {
            if (block.timestamp >= beastGames[i].startsAtTime && block.timestamp < beastGames[i].endsAtTime) {
                return (beastGames[i], i);
            }
        }

        revert NoActiveBeastGame();
    }

    function getCurrentParityGame() public view returns (ParityGame memory, uint256 idx) {
        for (uint256 i = parityGames.length - 1; i >= 0; i--) {
            if (block.timestamp >= parityGames[i].startsAtTime && block.timestamp < parityGames[i].endsAtTime) {
                return (parityGames[i], i);
            }
        }

        revert NoActiveParityGame();
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

    function setBeastVkCommitment(bytes32 vkCommitment) public onlyOwner {
        beastVkCommitment = vkCommitment;
        emit BeastProgramIdUpdated(beastVkCommitment);
    }

    function setParityVkCommitment(bytes32 vkCommitment) public onlyOwner {
        parityVkCommitment = vkCommitment;
        emit ParityProgramIdUpdated(beastVkCommitment);
    }

    function _isUserWhitelisted(address user) internal view returns (bool) {
        if (zkArcadeNft != address(0)) {
            ZkArcadeNft nftContract = ZkArcadeNft(zkArcadeNft);
            if (nftContract.balanceOf(user) > 0) {
                return true;
            }
        }
        
        if (zkArcadePublicNft != address(0)) {
            ZkArcadePublicNft publicNftContract = ZkArcadePublicNft(zkArcadePublicNft);
            if (publicNftContract.balanceOf(user) > 0) {
                return true;
            }
        }
        
        return false;
    }
}
