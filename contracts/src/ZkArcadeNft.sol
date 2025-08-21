// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

import {
    ERC721URIStorageUpgradeable,
    ERC721Upgradable
} from "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721URIStorageUpgradeable.sol";

contract ZkArcadeNft is ERC721URIStorageUpgradeable, UUPSUpgradeable, OwnableUpgradeable {
    uint256 private _nextTokenId;

    constructor(address owner, string memory name, string memory symbol) {
        __ERC721_init(name, symbol);
        __Ownable_init(owner);
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    function mint(address user, string memory tokenURI) public returns (uint256) {
        uint256 tokenId = _nextTokenId++;
        _mint(player, tokenId);
        _setTokenURI(tokenId, tokenURI);

        return tokenId;
    }

    function isWhitelisted(address user) public view returns (bool) {
        return balanceOf(user) >= 1;
    }
}
