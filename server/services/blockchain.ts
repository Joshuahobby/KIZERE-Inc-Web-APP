import Web3 from 'web3';
import { storage } from '../storage';
import type { BlockchainTransactionType } from '@shared/schema';

const BLOCKCHAIN_NODE_URL = process.env.BLOCKCHAIN_NODE_URL || 'http://localhost:8545';
const CONTRACT_ADDRESS = process.env.SMART_CONTRACT_ADDRESS;
const PRIVATE_KEY = process.env.BLOCKCHAIN_PRIVATE_KEY;

class BlockchainService {
  private web3: Web3;
  
  constructor() {
    this.web3 = new Web3(BLOCKCHAIN_NODE_URL);
  }

  async recordItemTransaction(
    itemId: number,
    itemType: 'DOCUMENT' | 'DEVICE',
    transactionType: BlockchainTransactionType,
    userId: number,
    metadata: Record<string, unknown> = {}
  ) {
    try {
      // Get the previous transaction for this item
      const previousTransactions = await storage.getItemBlockchainHistory(itemId, itemType);
      const previousHash = previousTransactions[0]?.transactionHash;

      // Create transaction data
      const transactionData = {
        itemId,
        itemType,
        transactionType,
        timestamp: new Date().toISOString(),
        metadata,
        previousHash
      };

      // Sign and send transaction to blockchain
      const hash = await this.sendToBlockchain(transactionData);
      const blockNumber = await this.web3.eth.getBlockNumber();

      // Record transaction in database
      const transaction = await storage.createBlockchainTransaction({
        transactionType,
        itemId,
        itemType,
        transactionHash: hash,
        blockNumber,
        previousHash,
        metadata,
        userId
      });

      // Update item's latest blockchain hash
      await storage.updateRegisteredItem(itemId, {
        latestBlockchainHash: hash,
        blockchainSynced: true
      });

      return transaction;
    } catch (error) {
      console.error('Error recording blockchain transaction:', error);
      throw error;
    }
  }

  private async sendToBlockchain(data: any): Promise<string> {
    try {
      // Create and sign transaction
      const transaction = {
        to: CONTRACT_ADDRESS,
        data: this.web3.eth.abi.encodeParameters(
          ['uint256', 'string', 'string', 'string', 'string'],
          [data.itemId, data.itemType, data.transactionType, JSON.stringify(data.metadata), data.previousHash || '']
        ),
        gas: 2000000
      };

      const signedTx = await this.web3.eth.accounts.signTransaction(transaction, PRIVATE_KEY!);
      const receipt = await this.web3.eth.sendSignedTransaction(signedTx.rawTransaction!);

      return receipt.transactionHash;
    } catch (error) {
      console.error('Error sending to blockchain:', error);
      throw error;
    }
  }

  async verifyItemHistory(itemId: number, itemType: 'DOCUMENT' | 'DEVICE'): Promise<boolean> {
    try {
      const transactions = await storage.getItemBlockchainHistory(itemId, itemType);
      
      // Verify chain integrity
      for (let i = 0; i < transactions.length - 1; i++) {
        const currentTx = transactions[i];
        const nextTx = transactions[i + 1];
        
        if (currentTx.previousHash !== nextTx.transactionHash) {
          return false;
        }
        
        // Verify transaction exists on blockchain
        const blockchainTx = await this.web3.eth.getTransaction(currentTx.transactionHash);
        if (!blockchainTx) {
          return false;
        }
      }
      
      return true;
    } catch (error) {
      console.error('Error verifying item history:', error);
      return false;
    }
  }
}

export const blockchainService = new BlockchainService();
