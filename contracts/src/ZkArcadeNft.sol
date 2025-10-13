// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

import {ERC721Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import {MerkleProof} from "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

contract ZkArcadeNft is ERC721Upgradeable, UUPSUpgradeable, OwnableUpgradeable {
    uint256 private _nextTokenId;

    bytes32[] public merkleRoots;
    mapping(address => bool) public hasClaimed;
    bool internal transfersEnabled;
    bool internal claimsEnabled;
    string private _baseTokenURI;

    /**
     * Events
     */
    event MerkleRootUpdated(bytes32 indexed newRoot, uint256 indexed rootIndex);
    event NFTClaimed(address indexed account);
    event TransfersEnabled();
    event TransfersDisabled();
    event ClaimsEnabled();
    event ClaimsDisabled();

    /**
     * Errors
     */
    error TransfersPaused();
    error ClaimsPaused();

    // ======== Initialization & Upgrades ========

    constructor() {
        _disableInitializers();
    }

    function initialize(address owner, string memory name, string memory symbol, string memory baseURI)
        public
        initializer
    {
        __ERC721_init(name, symbol);
        __Ownable_init(owner);
        _baseTokenURI = baseURI;
        transfersEnabled = false;
        claimsEnabled = true;
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    // ======== Core NFT Functions ========

    function claimNFT(bytes32[] calldata merkleProof, uint256 rootIndex) public returns (uint256) {
        if (!claimsEnabled) {
            revert ClaimsPaused();
        }
        require(!hasClaimed[msg.sender], "NFT already claimed for this address");

        require(rootIndex < merkleRoots.length, "Invalid root index");

        // Verify that the address is whitelisted using Merkle Proof
        bytes32 inner = keccak256(abi.encode(msg.sender));
        bytes32 leaf = keccak256(abi.encode(inner));
        require(MerkleProof.verify(merkleProof, merkleRoots[rootIndex], leaf), "Invalid merkle proof");

        // Mark as claimed
        hasClaimed[msg.sender] = true;

        // Mint the NFT
        uint256 tokenId = _nextTokenId++;
        _mint(msg.sender, tokenId);

        emit NFTClaimed(msg.sender);

        return tokenId;
    }

    function _update(address to, uint256 tokenId, address auth) internal override returns (address from) {
        from = _ownerOf(tokenId);
        // only block actual transfers (not mint or burn)
        if (!transfersEnabled && from != address(0) && to != address(0)) {
            revert TransfersPaused();
        }
        return super._update(to, tokenId, auth);
    }

    function _baseURI() internal view override returns (string memory) {
        return _baseTokenURI;
    }

    // ======== Whitelist & Merkle Management ========

    function isWhitelisted(address user) public view returns (bool) {
        return balanceOf(user) >= 1;
    }

    function addMerkleRoot(bytes32 _merkleRoot) external onlyOwner returns (uint256 index) {
        merkleRoots.push(_merkleRoot);
        index = merkleRoots.length - 1;
        emit MerkleRootUpdated(_merkleRoot, index);
    }

    function setMerkleRoot(bytes32 _merkleRoot, uint256 rootIndex) public onlyOwner {
        require(rootIndex < merkleRoots.length, "Invalid root index");
        merkleRoots[rootIndex] = _merkleRoot;

        emit MerkleRootUpdated(_merkleRoot, rootIndex);
    }

    // ======== Admin Controls ========

    function enableTransfers() public onlyOwner {
        transfersEnabled = true;
        emit TransfersEnabled();
    }

    function disableTransfers() public onlyOwner {
        transfersEnabled = false;
        emit TransfersDisabled();
    }

    function enableClaims() public onlyOwner {
        claimsEnabled = true;
        emit ClaimsEnabled();
    }

    function disableClaims() public onlyOwner {
        claimsEnabled = false;
        emit ClaimsDisabled();
    }

    function endSeason() public onlyOwner {
        claimsEnabled = false;
        transfersEnabled = true;
        emit ClaimsDisabled();
        emit TransfersEnabled();
    }

    function setBaseURI(string memory newBaseURI) public onlyOwner {
        _baseTokenURI = newBaseURI;
    }
}
