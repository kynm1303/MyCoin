import { time, timeStamp } from "console";
import { genesisTransaction, isValidAddress, Transaction, UnspentTxOut, updateUnspentTxOuts, validateBlockTransactions } from "./transaction";
import {hexToBinary} from './utils'
import {getCoinBaseTransaction} from './transaction'
import { createTransaction, getPrivateFromWallet, getPublicFromWallet } from "./wallet";
import { addToTransactionPool, getTransactionPool } from "./transactionPool";

class Block {

    public index: number;
    public hash: string;
    public previousHash: string;
    public timestamp: number;
    public data: Transaction[];
    public difficulty: number;
    public nonce: number;

    constructor(index: number, hash: string, previousHash: string,
        timestamp: number, data: Transaction[], difficulty: number, nonce: number) {
        this.index = index;
        this.previousHash = previousHash;
        this.timestamp = timestamp;
        this.data = data;
        this.hash = hash;
        this.difficulty = difficulty;
        this.nonce = nonce;
    }
}

const getLastestBlock = (): Block => blockchain[blockchain.length - 1];

const getCurrentTimestamp = (): number => Math.round(new Date().getTime() / 1000);

// in blocks
const DIFFICULTY_ADJUSTMENT_INTERVAL = 10;

// in seconds
const BLOCK_GENERATION_INTERVAL = 10;

const getAdjustedDifficulty = (latestBlock: Block, aBlockchain: Block[]) => {
    const prevAdjustmentBlock: Block = aBlockchain[blockchain.length - DIFFICULTY_ADJUSTMENT_INTERVAL];
    const timeExpected: number = BLOCK_GENERATION_INTERVAL * DIFFICULTY_ADJUSTMENT_INTERVAL;
    const timeTaken: number = latestBlock.timestamp - prevAdjustmentBlock.timestamp;
    if (timeTaken < timeExpected / 2) {
        return prevAdjustmentBlock.difficulty + 1;
    } else if (timeTaken > timeExpected * 2) {
        return prevAdjustmentBlock.difficulty - 1;
    } else {
        return prevAdjustmentBlock.difficulty;
    }
}

const getDifficulty = (aBlockchain: Block[]): number => {
    const lastestBlock: Block = aBlockchain[aBlockchain.length - 1];
    if (lastestBlock.index % DIFFICULTY_ADJUSTMENT_INTERVAL == 0) {
        return getAdjustedDifficulty(lastestBlock, aBlockchain);
    }
    return lastestBlock.difficulty;
}



const hashMatchesDifficulty = (hash: string, difficulty: number): boolean => {
    const hashInBinary: string = hexToBinary(hash);
    const requiredPrefix: string = '0'.repeat(difficulty);
    return hashInBinary.startsWith(requiredPrefix);
};

const findBlock = (index: number, previousHash: string, 
    timestamp: number, data: Transaction[],
    difficulty: number): Block => {
    let nonce = 0;
    while (true) {
        const hash: string = calculateHash(index, previousHash, timestamp, data, difficulty, nonce);
        if (hashMatchesDifficulty(hash, difficulty)) {
            return new Block(index, hash, previousHash, timestamp, data, difficulty, nonce);
        }
        nonce++;
    }
};

const generateRawNextBlock = (blockData: Transaction[]) => {
    const previousBlock = getLastestBlock();
    const nextIndex = previousBlock.index + 1;
    const nextTimestamp = getCurrentTimestamp();
    const previousHash = previousBlock.hash;
    const difficulty: number = getDifficulty(getBlockchain()); 
    const newBlock = findBlock(nextIndex, previousBlock.hash, nextTimestamp, blockData, difficulty);
    blockchain.push(newBlock);
    return newBlock;
}

const generateNextBlock = () => {
    const coinbaseTx: Transaction = getCoinBaseTransaction(getPublicFromWallet(), getLastestBlock().index + 1);
    const blockData: Transaction[] = [coinbaseTx].concat(getTransactionPool());
    return generateRawNextBlock(blockData);
};

const generateNextBlockWithTransaction = (receiverAddress: string, amount: number) => {
    if (!isValidAddress(receiverAddress)) {
        throw Error('invalid address');
    }
    if (typeof amount !== 'number') {
        throw Error('invalid amount');
    }
    const coinbaseTx: Transaction = getCoinBaseTransaction(getPublicFromWallet(), getLastestBlock().index + 1);
    const tx: Transaction = createTransaction(receiverAddress, amount, getPrivateFromWallet(),getUnspentTxOuts(), getTransactionPool());
    const blockData: Transaction[] = [coinbaseTx, tx];
    return generateRawNextBlock(blockData);
};

const calculateHashForBlock = (block: Block) => {
    return calculateHash(block.index, block.previousHash, block.timestamp, block.data, block.difficulty, block.nonce);
}

const calculateHash = (index: number, previousHash: string,
    timestamp: number, data: Transaction[], difficulty: number, nonce: number) => {
    return CryptoJS.SHA256(index + previousHash + timestamp + data + difficulty + nonce).toString();
}

const isValidBlockStructure = (block: Block): boolean => {
    return typeof block.index === 'number'
    && typeof block.timestamp === 'number'
    && typeof block.previousHash === 'string'
    && typeof block.data === 'object'
    && typeof block.hash === 'string'
}

const genesisBlock: Block = new Block(
    0,
    '91a73664bc84c0baa1fc75ea6e4aa6d1d20c5df664c724e3159aefc2e1186627',
    '',
    1465154705,
    [genesisTransaction],
    0,
    0
);

let blockchain: Block[] = [genesisBlock];
const getBlockchain = (): Block[] => blockchain;

const processTransactions = (aTransactions: Transaction[], aUnspentTxOuts: UnspentTxOut[], blockIndex: number) => {

    if (!validateBlockTransactions(aTransactions, aUnspentTxOuts, blockIndex)) {
        console.log('invalid block transactions');
        return null;
    }
    return updateUnspentTxOuts(aTransactions, aUnspentTxOuts);
};

const sendTransaction = (address: string, amount: number): Transaction => {
    const tx: Transaction = createTransaction(address, amount, getPrivateFromWallet(), getUnspentTxOuts(), getTransactionPool());
    addToTransactionPool(tx, getUnspentTxOuts());
    // broadCastTransactionPool();
    return tx;
};

// the unspent txOut of genesis block is set to unspentTxOuts on startup
let unspentTxOuts: UnspentTxOut[] = processTransactions(blockchain[0].data, [], 0);

const getUnspentTxOuts = (): UnspentTxOut[] => unspentTxOuts;

console.log(getBlockchain());

export {
    Block,
    getBlockchain,
    getLastestBlock,
    getUnspentTxOuts,
    generateRawNextBlock,
    generateNextBlock,
    generateNextBlockWithTransaction,
    sendTransaction
}