// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract CertificateRegistry {
    address public owner;
    mapping(bytes32 => uint256) public registeredAt;

    event CertificateRegistered(bytes32 indexed hash, uint256 timestamp);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function registerBatch(bytes32[] calldata hashes) external onlyOwner {
        for (uint256 i = 0; i < hashes.length; i++) {
            require(registeredAt[hashes[i]] == 0, "Hash already registered");
            registeredAt[hashes[i]] = block.timestamp;
            emit CertificateRegistered(hashes[i], block.timestamp);
        }
    }

    function isRegistered(bytes32 hash) external view returns (bool) {
        return registeredAt[hash] > 0;
    }
}
