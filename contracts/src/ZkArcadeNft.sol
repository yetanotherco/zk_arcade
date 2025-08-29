// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

import {ERC721URIStorageUpgradeable} from
    "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721URIStorageUpgradeable.sol";

import {ERC721Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";

contract ZkArcadeNft is ERC721URIStorageUpgradeable, UUPSUpgradeable, OwnableUpgradeable {
    uint256 private _nextTokenId;
    mapping(address => bool) public minters;

    constructor() {
        _disableInitializers();
    }

    function initialize(address owner, string memory name, string memory symbol) public initializer {
        __ERC721_init(name, symbol);
        __Ownable_init(owner);
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    function mint(string memory tokenURI) public onlyMinters(msg.sender) returns (uint256) {
        uint256 tokenId = _nextTokenId++;
        _mint(msg.sender, tokenId);
        _setTokenURI(tokenId, tokenURI);

        return tokenId;
    }

    function isWhitelisted(address user) public view returns (bool) {
        return balanceOf(user) >= 1;
    }

    function authorizeMinter(address user) public onlyOwner {
        minters[user] = true;
    }

    function revokeMinter(address user) public onlyOwner {
        minters[user] = false;
    }

    modifier onlyMinters(address user) {
        require(minters[user], "Only minters can call this function");
        _;
    }
}
