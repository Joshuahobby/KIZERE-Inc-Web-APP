// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract ItemTracker {
    struct ItemHistory {
        uint256 itemId;
        string itemType;
        string transactionType;
        string metadata;
        string previousHash;
        uint256 timestamp;
    }

    mapping(bytes32 => ItemHistory) public itemHistories;
    mapping(uint256 => bytes32[]) public itemTransactions;

    event ItemHistoryRecorded(
        uint256 indexed itemId,
        string itemType,
        string transactionType,
        bytes32 transactionHash,
        uint256 timestamp
    );

    function recordItemHistory(
        uint256 _itemId,
        string memory _itemType,
        string memory _transactionType,
        string memory _metadata,
        string memory _previousHash
    ) public returns (bytes32) {
        ItemHistory memory history = ItemHistory({
            itemId: _itemId,
            itemType: _itemType,
            transactionType: _transactionType,
            metadata: _metadata,
            previousHash: _previousHash,
            timestamp: block.timestamp
        });

        bytes32 transactionHash = keccak256(
            abi.encodePacked(
                _itemId,
                _itemType,
                _transactionType,
                _metadata,
                _previousHash,
                block.timestamp
            )
        );

        itemHistories[transactionHash] = history;
        itemTransactions[_itemId].push(transactionHash);

        emit ItemHistoryRecorded(
            _itemId,
            _itemType,
            _transactionType,
            transactionHash,
            block.timestamp
        );

        return transactionHash;
    }

    function getItemHistory(uint256 _itemId) public view returns (bytes32[] memory) {
        return itemTransactions[_itemId];
    }

    function getHistoryDetails(bytes32 _transactionHash)
        public
        view
        returns (ItemHistory memory)
    {
        return itemHistories[_transactionHash];
    }
}
