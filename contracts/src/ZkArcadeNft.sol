// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

import {ERC721URIStorageUpgradeable} from
    "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721URIStorageUpgradeable.sol";

import {ERC721Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import {MerkleProof} from "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

contract ZkArcadeNft is ERC721URIStorageUpgradeable, UUPSUpgradeable, OwnableUpgradeable {
    uint256 private _nextTokenId;

    bytes32[] public merkleRoots;
    mapping(address => bool) public hasClaimed;

    event MerkleRootUpdated(bytes32 indexed newRoot, uint256 indexed rootIndex);
    event NFTClaimed(address indexed account);

    constructor() {
        _disableInitializers();
    }

    function initialize(
        address owner, 
        string memory name, 
        string memory symbol,
        bytes32[] memory _merkleRoots
    ) public initializer {
        __ERC721_init(name, symbol);
        __Ownable_init(owner);
        merkleRoots = _merkleRoots;
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    function claimNFT(bytes32[] calldata merkleProof, string memory tokenURI, uint256 rootIndex) public returns (uint256) {
        require(!hasClaimed[msg.sender], "NFT already claimed for this address");

        require(rootIndex < merkleRoots.length, "Invalid root index");

        // Verify that the address is whitelisted using Merkle Proof
        bytes32 inner = keccak256(abi.encode(msg.sender));
        bytes32 leaf  = keccak256(abi.encode(inner));
        require(MerkleProof.verify(merkleProof, merkleRoots[rootIndex], leaf), "Invalid merkle proof");

        // Mark as claimed
        hasClaimed[msg.sender] = true;

        // Mint the NFT
        uint256 tokenId = _nextTokenId++;
        _mint(msg.sender, tokenId);
        _setTokenURI(tokenId, tokenURI);

        emit NFTClaimed(msg.sender);

        return tokenId;
    }

    function isWhitelisted(address user) public view returns (bool) {
        return balanceOf(user) >= 1;
    }

    function setMerkleRoot(bytes32 _merkleRoot, uint256 rootIndex) public onlyOwner {
        require(rootIndex < merkleRoots.length, "Invalid root index");
        merkleRoots[rootIndex] = _merkleRoot;

        emit MerkleRootUpdated(_merkleRoot, rootIndex);
    }
}
