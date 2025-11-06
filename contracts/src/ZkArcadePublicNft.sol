// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {ERC721Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import {MerkleProof} from "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

contract ZkArcadePublicNft is ERC721Upgradeable, UUPSUpgradeable, OwnableUpgradeable {
    uint256 private _nextTokenId;
    uint256 public maxSupply;
    bool public mintingEnabled;
    bytes32[] public merkleRoots;
    mapping(address => bool) public hasClaimed;
    bool internal transfersEnabled;
    string private _baseTokenURI;

    uint256 public constant BASE_PRICE = 30000000000000000; // 0.03 ETH
    uint256 public constant DISCOUNT_PERCENTAGE = 50; // 50% discount for whitelisted users

    /**
     * Events
     */
    event MerkleRootUpdated(bytes32 indexed newRoot, uint256 indexed rootIndex);
    event MintingEnabled();
    event MintingDisabled();
    event TransfersEnabled();
    event TransfersDisabled();
    event NFTMinted(address indexed account, uint256 tokenId);

    /**
     * Errors
     */
    error MintingPaused();
    error MaxSupplyExceeded();
    error AlreadyOwnsNFT();
    error TransfersPaused();
    error ClaimsPaused();

    // ======== Initialization & Upgrades ========

    constructor() {
        _disableInitializers();
    }

    function initialize(
        address owner,
        string memory name,
        string memory symbol,
        string memory baseURI,
        uint256 _maxSupply
    ) public initializer {
        __ERC721_init(name, symbol);
        __Ownable_init(owner);
        _baseTokenURI = baseURI;
        maxSupply = _maxSupply;
        mintingEnabled = false;
        transfersEnabled = false;
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    // ======== Core NFT Functions ========

    // This mint function allows whitelisted users to mint an NFT for a discounted price. The not whitelisted
    // users can use the mint() function.
    function whitelistedMint(bytes32[] calldata merkleProof, uint256 rootIndex) public payable returns (uint256) {
        if (!mintingEnabled) {
            revert MintingPaused();
        }

        if (balanceOf(msg.sender) > 0) {
            revert AlreadyOwnsNFT();
        }
        
        if (_nextTokenId >= maxSupply) {
            revert MaxSupplyExceeded();
        }

        require(rootIndex < merkleRoots.length, "Invalid root index");

        // Verify that the address is whitelisted using Merkle Proof
        bytes32 inner = keccak256(abi.encode(msg.sender));
        bytes32 leaf = keccak256(abi.encode(inner));
        require(MerkleProof.verify(merkleProof, merkleRoots[rootIndex], leaf), "Invalid merkle proof");

        // Check if the user has payed the amount required ($50 or 0.015 ETH) for the NFT
        if (msg.value < BASE_PRICE * (100 - DISCOUNT_PERCENTAGE) / 100) {
            revert("Not enough money to pay for the NFT");
        }

        // Mark as claimed
        hasClaimed[msg.sender] = true;

        // Mint the NFT
        uint256 tokenId = _nextTokenId++;
        _mint(msg.sender, tokenId);
        
        emit NFTMinted(msg.sender, tokenId);
        return tokenId;
    }

    // This mint function allows non-whitelisted users to mint an NFT at the regular price.
    function mint() public payable returns (uint256) {
        if (!mintingEnabled) {
            revert MintingPaused();
        }
        
        if (balanceOf(msg.sender) > 0) {
            revert AlreadyOwnsNFT();
        }
        
        if (_nextTokenId >= maxSupply) {
            revert MaxSupplyExceeded();
        }

        // Check if the user has payed the amount required ($100 or 0.030 ETH) for the NFT
         if (msg.value < BASE_PRICE) {
            revert("Not enough money to pay for the NFT");
        }

        uint256 tokenId = _nextTokenId++;
        _mint(msg.sender, tokenId);
        
        emit NFTMinted(msg.sender, tokenId);
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

    // ======== View Functions ========

    function totalSupply() external view returns (uint256) {
        return _nextTokenId;
    }

    function _baseURI() internal view override returns (string memory) {
        return _baseTokenURI;
    }

    // ======== Admin Controls ========

    function addMerkleRoot(bytes32 _merkleRoot) external onlyOwner returns (uint256 index) {
        merkleRoots.push(_merkleRoot);
        index = merkleRoots.length - 1;
        emit MerkleRootUpdated(_merkleRoot, index);
    }

    function setMerkleRoot(bytes32 _merkleRoot, uint256 rootIndex) external onlyOwner {
        require(rootIndex < merkleRoots.length, "Invalid root index");
        merkleRoots[rootIndex] = _merkleRoot;

        emit MerkleRootUpdated(_merkleRoot, rootIndex);
    }

    function enableMinting() external onlyOwner {
        mintingEnabled = true;
        emit MintingEnabled();
    }

    function disableMinting() external onlyOwner {
        mintingEnabled = false;
        emit MintingDisabled();
    }

    function enableTransfers() external onlyOwner {
        transfersEnabled = true;
        emit TransfersEnabled();
    }

    function disableTransfers() external onlyOwner {
        transfersEnabled = false;
        emit TransfersDisabled();
    }

    function setBaseURI(string memory newBaseURI) external onlyOwner {
        _baseTokenURI = newBaseURI;
    }
}
