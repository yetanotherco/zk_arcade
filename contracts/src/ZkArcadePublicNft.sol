// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {ERC721Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";

contract ZkArcadePublicNft is ERC721Upgradeable, UUPSUpgradeable, OwnableUpgradeable {
    uint256 private _nextTokenId;
    uint256 public maxSupply;
    bool public mintingIsEnabled;
    bool public transfersEnabled;
    string private _baseTokenURI;

    event MintingEnabled();
    event MintingDisabled();
    event TransfersEnabled();
    event TransfersDisabled();
    event NFTMinted(address indexed account, uint256 tokenId);

    error MintingNotEnabled();
    error MaxSupplyExceeded();
    error AlreadyOwnsNFT();
    error TransfersPaused();

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
        mintingIsEnabled = false;
        transfersEnabled = false;
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    function mint() public returns (uint256) {
        if (!mintingIsEnabled) {
            revert MintingNotEnabled();
        }
        
        if (balanceOf(msg.sender) > 0) {
            revert AlreadyOwnsNFT();
        }
        
        if (_nextTokenId >= maxSupply) {
            revert MaxSupplyExceeded();
        }

        uint256 tokenId = _nextTokenId++;
        _mint(msg.sender, tokenId);
        
        emit NFTMinted(msg.sender, tokenId);
        return tokenId;
    }

    function enableMinting() external onlyOwner {
        mintingIsEnabled = true;
        emit MintingEnabled();
    }

    function disableMinting() external onlyOwner {
        mintingIsEnabled = false;
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

    function transferFrom(address from, address to, uint256 tokenId) public override {
        if (!transfersEnabled) {
            revert TransfersPaused();
        }
        super.transferFrom(from, to, tokenId);
    }

    function setBaseURI(string memory newBaseURI) external onlyOwner {
        _baseTokenURI = newBaseURI;
    }

    function _baseURI() internal view override returns (string memory) {
        return _baseTokenURI;
    }

    function totalSupply() external view returns (uint256) {
        return _nextTokenId;
    }
}
