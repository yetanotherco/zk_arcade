// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

contract Leaderboard is UUPSUpgradeable, OwnableUpgradeable {
    /**
     * Storage
     */
    address public alignedServiceManager;
    address public alignedBatcherPaymentService;
    mapping(address => uint256) public usersScore;
    mapping(address => uint256) public usersBeastLevelCompleted;

    /**
     * Errors
     */
    error CallToAlignedContractFailed();
    error ProofNotVerifiedOnAligned();
    error UserHasAlreadyCompletedThisLevel(uint256 level);

    /**
     * Events
     */
    event NewSolutionSubmitted(address user, uint256 level);

    constructor() {
        _disableInitializers();
    }

    function initialize(address owner, address _alignedServiceManager, address _alignedBatcherPaymentService)
        public
        initializer
    {
        alignedServiceManager = _alignedServiceManager;
        alignedBatcherPaymentService = _alignedBatcherPaymentService;
        __Ownable_init(owner);
        __UUPSUpgradeable_init();
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    function submitBeastSolution(
        bytes32 proofCommitment,
        bytes calldata publicInputs,
        bytes32 provingSystemAuxDataCommitment,
        bytes20 proofGeneratorAddr,
        bytes32 batchMerkleRoot,
        bytes memory merkleProof,
        uint256 verificationDataBatchIndex
    ) public {
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

        uint256 levelCompleted = abi.decode(publicInputs, (uint256));
        uint256 currentLevelCompleted = usersBeastLevelCompleted[msg.sender];
        if (levelCompleted <= currentLevelCompleted) {
            revert UserHasAlreadyCompletedThisLevel(currentLevelCompleted);
        }
        usersBeastLevelCompleted[msg.sender] = levelCompleted;

        usersScore[msg.sender] += levelCompleted - currentLevelCompleted;

        emit NewSolutionSubmitted(msg.sender, levelCompleted);
    }

    function getUserScore(address user) public view returns (uint256) {
        return usersScore[user];
    }

    function getUserBeastLevelCompleted(address user) public view returns (uint256) {
        return usersBeastLevelCompleted[user];
    }
}
