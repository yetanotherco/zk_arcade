// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {ERC721Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import {MerkleProof} from "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";

contract ZkArcadePublicNft is ERC721Upgradeable, UUPSUpgradeable, OwnableUpgradeable, ReentrancyGuardUpgradeable {
    uint256 private _nextTokenId;
    uint256 public maxSupply;
    bool public mintingEnabled;
    bytes32[] public merkleRoots;
    mapping(address => bool) public hasClaimed;
    bool internal transfersEnabled;
    string private _baseTokenURI;
    address public _mintingFundsRecipient;

    uint256 public fullPrice;
    uint256 public discountedPrice;

    /**
     * Events
     */
    event MerkleRootUpdated(bytes32 indexed newRoot, uint256 indexed rootIndex);
    event MintingEnabled();
    event MintingDisabled();
    event TransfersEnabled();
    event TransfersDisabled();
    event NFTMinted(address indexed account, uint256 tokenId);
    event BaseURIUpdated(string newBaseURI);
    event FullPriceUpdated(uint256 newPrice);
    event DiscountedPriceUpdated(uint256 newPrice);
    event MintingFundsRecipientUpdated(address newRecipient);

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
        uint256 _maxSupply,
        address _mintingFundsRecipientAddress
    ) public initializer {
        __ERC721_init(name, symbol);
        __Ownable_init(owner);
        __ReentrancyGuard_init();
        _baseTokenURI = baseURI;
        maxSupply = _maxSupply;
        fullPrice = 0.03 ether;
        discountedPrice = 0.015 ether;
        mintingEnabled = false;
        transfersEnabled = false;
        _mintingFundsRecipient = _mintingFundsRecipientAddress;
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    // ======== Core NFT Functions ========

    // This mint function allows whitelisted users to mint an NFT for a discounted price. The not whitelisted
    // users can use the mint() function.
    function whitelistedMint(bytes32[] calldata merkleProof, uint256 rootIndex) public payable nonReentrant returns (uint256) {
        if (!mintingEnabled) {
            revert MintingPaused();
        }

        require(!hasClaimed[msg.sender], "NFT already claimed for this address");


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
         if (msg.value < discountedPrice) {
            revert("Not enough money to pay for the NFT");
        }

        // Mark as claimed
        hasClaimed[msg.sender] = true;

        // Mint the NFT
        uint256 tokenId = _nextTokenId++;
        _mint(msg.sender, tokenId);

        // If the payment is above the required amount, return the extra funds to the sender
        if (msg.value > discountedPrice) {
            uint256 refundAmount = msg.value - discountedPrice;
            (bool refundSuccess, ) = msg.sender.call{value: refundAmount}("");
            require(refundSuccess, "Failed to refund excess payment");
        }

        // Forward funds to the minting funds recipient
        uint256 toForward = msg.value <= discountedPrice ? msg.value : discountedPrice;
        (bool success, ) = _mintingFundsRecipient.call{value: toForward}("");
        require(success, "Failed to forward funds");

        emit NFTMinted(msg.sender, tokenId);
        return tokenId;
    }

    // This mint function allows non-whitelisted users to mint an NFT at the regular price.
    function mint() public payable nonReentrant returns (uint256) {
        if (!mintingEnabled) {
            revert MintingPaused();
        }

        require(!hasClaimed[msg.sender], "NFT already claimed for this address");

        if (balanceOf(msg.sender) > 0) {
            revert AlreadyOwnsNFT();
        }
        
        if (_nextTokenId >= maxSupply) {
            revert MaxSupplyExceeded();
        }

        // Check if the user has payed the amount required ($100 or 0.030 ETH) for the NFT
         if (msg.value < fullPrice) {
            revert("Not enough money to pay for the NFT");
        }

        // Mark as claimed
        hasClaimed[msg.sender] = true;

        uint256 tokenId = _nextTokenId++;
        _mint(msg.sender, tokenId);

        // If the payment is above the required amount, return the extra funds to the sender
        if (msg.value > discountedPrice) {
            uint256 refundAmount = msg.value - discountedPrice;
            (bool refundSuccess, ) = msg.sender.call{value: refundAmount}("");
            require(refundSuccess, "Failed to refund excess payment");
        }
 
        // Forward funds to the minting funds recipient
        uint256 toForward = msg.value <= discountedPrice ? msg.value : discountedPrice;
        (bool success, ) = _mintingFundsRecipient.call{value: toForward}("");
        require(success, "Failed to forward funds");

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
        emit BaseURIUpdated(newBaseURI);
    }

    function setFullPrice(uint256 newPrice) external onlyOwner {
        fullPrice = newPrice;
        emit FullPriceUpdated(newPrice);
    }

    function setDiscountedPrice(uint256 newPrice) external onlyOwner {
        discountedPrice = newPrice;
        emit DiscountedPriceUpdated(newPrice);
    }

    function setMintingFundsRecipient(address newRecipient) external onlyOwner {
        _mintingFundsRecipient = newRecipient;
        emit MintingFundsRecipientUpdated(newRecipient);
    }
}
