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
        // Note: each level takes 4 bytes (i.e 32 bits) in total we can have as much as 8 levels per config
        // The first byte represent the number of blocks in the map
        // The second byte represent the number of static blocks in the map
        // The third byte represent the number of common beasts in the map
        // The fourth byte represent the number of super beasts in the map
        uint256 gameConfig;
        uint256 startsAtTime;
    }

    struct ParityGame {
        uint256 endsAtTime;
        // Note: each level takes 10 bytes (i.e 80 bits) in total we can have as much as 3 levels per config
        // The first byte is for the position (first 4 bits for x, last 4 bits for y)
        // And the rest 9 bytes represent the number in the board
        uint256 gameConfig;
        uint256 startsAtTime;
    }

    BeastGame[] public beastGames;
    ParityGame[] public parityGames;

    mapping(bytes32 => uint256) public usersBeastLevelCompleted;
    mapping(bytes32 => uint256) public usersParityLevelCompleted;

    bytes32 internal beastVkCommitment;
    bytes32 internal parityVkCommitment;

    address public zkArcadeNft;
    address public zkArcadePublicNft;
    bool public useWhitelist;

    uint256 constant MAX_PARITY_LEVELS = 3; // Must match circom circuit
    uint256 constant BITS_PER_PARITY_LEVEL = 80; // 10 bytes per level

    event BeastPointsClaimed(address user, uint256 level, uint256 score, uint256 gameConfig);
    event ParityPointsClaimed(address user, uint256 level, uint256 score, uint256 gameConfig);
    event BeastGamesUpdated(BeastGame[] beastGames);
    event ParityGamesUpdated(ParityGame[] parityGames);
    event WhitelistEnabled();
    event WhitelistDisabled();
    event ZkArcadeNftAddressUpdated(address nftContractAddress);
    event ZkArcadePublicNftAddressUpdated(address nftContractAddress);
    event BeastProgramIdUpdated(bytes32 newProgramId);
    event ParityProgramIdUpdated(bytes32 newProgramId);

    error CallToAlignedContractFailed();
    error ProofNotVerifiedOnAligned();
    error UserHasAlreadyCompletedThisLevel(uint256 level);
    error UserAddressMismatch(address expected, address actual);
    error UserIsNotWhitelisted(address);
    error InvalidGame(uint256 expected, uint256 provided);
    error NoActiveBeastGame();
    error NoActiveParityGame();
    error GameEnded();
    error GameNotStarted();
    error ParityLevelTooLarge();

    // ======== Initialization & Upgrades ========

    constructor() {
        _disableInitializers();
    }

    function initialize(
        address owner,
        address _alignedServiceManager,
        address _alignedBatcherPaymentService,
        address _zkArcadeNft,
        BeastGame[] calldata _beastGames,
        ParityGame[] calldata _parityGames,
        bool _useWhitelist,
        bytes32 _beastVkCommitment,
        bytes32 _parityVkCommitment
    ) public initializer {
        require(_alignedServiceManager != address(0) &&
            _alignedServiceManager.code.length > 0, "invalid alignedServiceManager");
        require(_alignedBatcherPaymentService != address(0) &&
            _alignedBatcherPaymentService.code.length > 0, "invalid alignedBatcherPaymentService");
        alignedServiceManager = _alignedServiceManager;
        alignedBatcherPaymentService = _alignedBatcherPaymentService;
        beastGames = _beastGames;
        zkArcadeNft = _zkArcadeNft;
        zkArcadePublicNft = address(0);
        useWhitelist = _useWhitelist;
        parityGames = _parityGames;
        beastVkCommitment = _beastVkCommitment;
        parityVkCommitment = _parityVkCommitment;
        __Ownable_init(owner);
        __UUPSUpgradeable_init();
        emit BeastGamesUpdated(_beastGames);
        emit ParityGamesUpdated(_parityGames);
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    // ======== Core Game Functions ========

    function claimBeastPoints(
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

        if (useWhitelist && !isUserWhitelisted(userAddress)) {
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
        if (block.timestamp < game.startsAtTime) {
            revert GameNotStarted();
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

        emit BeastPointsClaimed(msg.sender, levelCompleted, usersScore[msg.sender], gameConfig);
    }

    function claimParityPoints(
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

        if (useWhitelist && !isUserWhitelisted(userAddress)) {
            revert UserIsNotWhitelisted(userAddress);
        }

        if (levelCompleted > MAX_PARITY_LEVELS) revert ParityLevelTooLarge();

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
        if (block.timestamp < currentGame.startsAtTime) {
            revert GameNotStarted();
        }

        // The circom program proves the user knows solutions to (3) parity games.
        // When fewer games are played, all public inputs for unplayed levels are set to 0.
        // This means only the first `levelCompleted` levels contain meaningful gameConfig data.
        // To compare configurations, we right-shift the data to discard the zero-filled remainder.
        uint256 bits = BITS_PER_PARITY_LEVEL * levelCompleted;
        uint256 shiftAmount = 256 - bits;
        uint256 currentTruncatedConfig = currentGame.gameConfig >> shiftAmount;
        uint256 newTruncatedConfig = gameConfig >> shiftAmount;

        if (currentTruncatedConfig != newTruncatedConfig) {
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

        emit ParityPointsClaimed(msg.sender, levelCompleted, usersScore[msg.sender], gameConfig);
    }

    // ======== View Functions ========

    function getUserScore(address user) public view returns (uint256) {
        return usersScore[user];
    }

    function getUserBeastLevelCompleted(bytes32 key) public view returns (uint256) {
        return usersBeastLevelCompleted[key];
    }

    function getCurrentBeastGame() public view returns (BeastGame memory, uint256 idx) {
        for (uint256 i = beastGames.length; i > 0; i--) {
            uint256 j = i - 1;
            BeastGame memory game = beastGames[j];
            if (block.timestamp >= game.startsAtTime && block.timestamp < game.endsAtTime) {
                return (game, j);
            }
        }

        revert NoActiveBeastGame();
    }

    function getCurrentParityGame() public view returns (ParityGame memory, uint256 idx) {
        for (uint256 i = parityGames.length; i > 0; i--) {
            uint256 j = i - 1;
            ParityGame memory game = parityGames[j];
            if (block.timestamp >= game.startsAtTime && block.timestamp < game.endsAtTime) {
                return (game, j);
            }
        }

        revert NoActiveParityGame();
    }

    function getTop10Score() external view returns (address[10] memory) {
        return top10Score;
    }

    // ======== Admin Functions ========

    /// @notice Sets the beast games configuration
    /// @param _beastGames The new beast games configuration
    function setBeastGames(BeastGame[] calldata _beastGames) public onlyOwner {
        beastGames = _beastGames;
        emit BeastGamesUpdated(_beastGames);
    }

    /// @notice Adds new beast games configuration
    /// @param _newBeastGames The new beast games configuration to add
    function addBeastGames(BeastGame[] calldata _newBeastGames) public onlyOwner {
        for (uint256 i = 0; i < _newBeastGames.length; i++) {
            beastGames.push(_newBeastGames[i]);
        }
        emit BeastGamesUpdated(_newBeastGames);
    }

    /// @notice Sets the parity games configuration
    /// @param _parityGames The new parity games configuration
    function setParityGames(ParityGame[] calldata _parityGames) public onlyOwner {
        parityGames = _parityGames;
        emit ParityGamesUpdated(parityGames);
    }

    /// @notice Adds new parity games configuration
    /// @param _newParityGames The new parity games configuration to add
    function addParityGames(ParityGame[] calldata _newParityGames) public onlyOwner {
        for (uint256 i = 0; i < _newParityGames.length; i++) {
            parityGames.push(_newParityGames[i]);
        }
        emit ParityGamesUpdated(_newParityGames);
    }

    function enableWhitelist() public onlyOwner {
        useWhitelist = true;
        emit WhitelistEnabled();
    }

    function disableWhitelist() public onlyOwner {
        useWhitelist = false;
        emit WhitelistDisabled();
    }

    function setZkArcadeNftAddress(address nftContractAddress) public onlyOwner {
        zkArcadeNft = nftContractAddress;
        emit ZkArcadeNftAddressUpdated(nftContractAddress);
    }

    function setZkArcadePublicNftAddress(address nftContractAddress) public onlyOwner {
        zkArcadePublicNft = nftContractAddress;
        emit ZkArcadePublicNftAddressUpdated(nftContractAddress);
    }

    function setBeastVkCommitment(bytes32 vkCommitment) public onlyOwner {
        beastVkCommitment = vkCommitment;
        emit BeastProgramIdUpdated(beastVkCommitment);
    }

    function setParityVkCommitment(bytes32 vkCommitment) public onlyOwner {
        parityVkCommitment = vkCommitment;
        emit ParityProgramIdUpdated(parityVkCommitment);
    }

    // ======== Internal Helper Functions ========

    function getBeastKey(address user, uint256 game) internal pure returns (bytes32) {
        return keccak256(abi.encode(user, game));
    }

    function getParityKey(address user, uint256 gameConfig) internal pure returns (bytes32) {
        return keccak256(abi.encode(user, gameConfig));
    }

    function verifyAndReplaceInTop10(address user) internal {
        uint256 userScore = usersScore[user];
        uint256 lastScore = top10Score[9] == address(0) ? 0 : usersScore[top10Score[9]];

        // early return to not run the whole alg if the user does not have enough points to be in the top 10
        if (top10Score[9] != user && userScore <= lastScore) {
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

    function isUserWhitelisted(address user) public view returns (bool) {
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
