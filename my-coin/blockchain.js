"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.replaceChain = exports.addBlockToChain = exports.isValidBlockStructure = exports.sendTransaction = exports.generateNextBlockWithTransaction = exports.generateNextBlock = exports.generateRawNextBlock = exports.getUnspentTxOuts = exports.getLastestBlock = exports.getBlockchain = exports.Block = void 0;
const transaction_1 = require("./transaction");
const utils_1 = require("./utils");
const transaction_2 = require("./transaction");
const wallet_1 = require("./wallet");
const transactionPool_1 = require("./transactionPool");
const p2p_1 = require("./p2p");
class Block {
    constructor(index, hash, previousHash, timestamp, data, difficulty, nonce) {
        this.index = index;
        this.previousHash = previousHash;
        this.timestamp = timestamp;
        this.data = data;
        this.hash = hash;
        this.difficulty = difficulty;
        this.nonce = nonce;
    }
}
exports.Block = Block;
const getLastestBlock = () => blockchain[blockchain.length - 1];
exports.getLastestBlock = getLastestBlock;
const getCurrentTimestamp = () => Math.round(new Date().getTime() / 1000);
const DIFFICULTY_ADJUSTMENT_INTERVAL = 10;
const BLOCK_GENERATION_INTERVAL = 10;
const getAdjustedDifficulty = (latestBlock, aBlockchain) => {
    const prevAdjustmentBlock = aBlockchain[blockchain.length - DIFFICULTY_ADJUSTMENT_INTERVAL];
    const timeExpected = BLOCK_GENERATION_INTERVAL * DIFFICULTY_ADJUSTMENT_INTERVAL;
    const timeTaken = latestBlock.timestamp - prevAdjustmentBlock.timestamp;
    if (timeTaken < timeExpected / 2) {
        return prevAdjustmentBlock.difficulty + 1;
    }
    else if (timeTaken > timeExpected * 2) {
        return prevAdjustmentBlock.difficulty - 1;
    }
    else {
        return prevAdjustmentBlock.difficulty;
    }
};
const getDifficulty = (aBlockchain) => {
    const lastestBlock = aBlockchain[aBlockchain.length - 1];
    if (lastestBlock.index % DIFFICULTY_ADJUSTMENT_INTERVAL == 0) {
        return getAdjustedDifficulty(lastestBlock, aBlockchain);
    }
    return lastestBlock.difficulty;
};
const hashMatchesDifficulty = (hash, difficulty) => {
    const hashInBinary = (0, utils_1.hexToBinary)(hash);
    const requiredPrefix = '0'.repeat(difficulty);
    return hashInBinary.startsWith(requiredPrefix);
};
const findBlock = (index, previousHash, timestamp, data, difficulty) => {
    let nonce = 0;
    while (true) {
        const hash = calculateHash(index, previousHash, timestamp, data, difficulty, nonce);
        if (hashMatchesDifficulty(hash, difficulty)) {
            return new Block(index, hash, previousHash, timestamp, data, difficulty, nonce);
        }
        nonce++;
    }
};
const generateRawNextBlock = (blockData) => {
    const previousBlock = getLastestBlock();
    const nextIndex = previousBlock.index + 1;
    const nextTimestamp = getCurrentTimestamp();
    const previousHash = previousBlock.hash;
    const difficulty = getDifficulty(getBlockchain());
    const newBlock = findBlock(nextIndex, previousBlock.hash, nextTimestamp, blockData, difficulty);
    blockchain.push(newBlock);
    return newBlock;
};
exports.generateRawNextBlock = generateRawNextBlock;
const generateNextBlock = () => {
    const coinbaseTx = (0, transaction_2.getCoinBaseTransaction)((0, wallet_1.getPublicFromWallet)(), getLastestBlock().index + 1);
    const blockData = [coinbaseTx].concat((0, transactionPool_1.getTransactionPool)());
    return generateRawNextBlock(blockData);
};
exports.generateNextBlock = generateNextBlock;
const generateNextBlockWithTransaction = (receiverAddress, amount) => {
    if (!(0, transaction_1.isValidAddress)(receiverAddress)) {
        throw Error('invalid address');
    }
    if (typeof amount !== 'number') {
        throw Error('invalid amount');
    }
    const coinbaseTx = (0, transaction_2.getCoinBaseTransaction)((0, wallet_1.getPublicFromWallet)(), getLastestBlock().index + 1);
    const tx = (0, wallet_1.createTransaction)(receiverAddress, amount, (0, wallet_1.getPrivateFromWallet)(), getUnspentTxOuts(), (0, transactionPool_1.getTransactionPool)());
    const blockData = [coinbaseTx, tx];
    return generateRawNextBlock(blockData);
};
exports.generateNextBlockWithTransaction = generateNextBlockWithTransaction;
const calculateHashForBlock = (block) => {
    return calculateHash(block.index, block.previousHash, block.timestamp, block.data, block.difficulty, block.nonce);
};
const calculateHash = (index, previousHash, timestamp, data, difficulty, nonce) => {
    return CryptoJS.SHA256(index + previousHash + timestamp + data + difficulty + nonce).toString();
};
const isValidBlockStructure = (block) => {
    return typeof block.index === 'number'
        && typeof block.timestamp === 'number'
        && typeof block.previousHash === 'string'
        && typeof block.data === 'object'
        && typeof block.hash === 'string';
};
exports.isValidBlockStructure = isValidBlockStructure;
const genesisBlock = new Block(0, '91a73664bc84c0baa1fc75ea6e4aa6d1d20c5df664c724e3159aefc2e1186627', '', 1465154705, [transaction_1.genesisTransaction], 0, 0);
let blockchain = [genesisBlock];
const getBlockchain = () => blockchain;
exports.getBlockchain = getBlockchain;
const processTransactions = (aTransactions, aUnspentTxOuts, blockIndex) => {
    if (!(0, transaction_1.validateBlockTransactions)(aTransactions, aUnspentTxOuts, blockIndex)) {
        console.log('invalid block transactions');
        return null;
    }
    return (0, transaction_1.updateUnspentTxOuts)(aTransactions, aUnspentTxOuts);
};
const sendTransaction = (address, amount) => {
    const tx = (0, wallet_1.createTransaction)(address, amount, (0, wallet_1.getPrivateFromWallet)(), getUnspentTxOuts(), (0, transactionPool_1.getTransactionPool)());
    (0, transactionPool_1.addToTransactionPool)(tx, getUnspentTxOuts());
    (0, p2p_1.broadCastTransactionPool)();
    return tx;
};
exports.sendTransaction = sendTransaction;
let unspentTxOuts = processTransactions(blockchain[0].data, [], 0);
const getUnspentTxOuts = () => unspentTxOuts;
exports.getUnspentTxOuts = getUnspentTxOuts;
console.log(getBlockchain());
const isValidTimestamp = (newBlock, previousBlock) => {
    return (previousBlock.timestamp - 60 < newBlock.timestamp)
        && newBlock.timestamp - 60 < getCurrentTimestamp();
};
const hashMatchesBlockContent = (block) => {
    const blockHash = calculateHashForBlock(block);
    return blockHash === block.hash;
};
const hasValidHash = (block) => {
    if (!hashMatchesBlockContent(block)) {
        console.log('invalid hash, got:' + block.hash);
        return false;
    }
    if (!hashMatchesDifficulty(block.hash, block.difficulty)) {
        console.log('block difficulty not satisfied. Expected: ' + block.difficulty + 'got: ' + block.hash);
    }
    return true;
};
const isValidNewBlock = (newBlock, previousBlock) => {
    if (!isValidBlockStructure(newBlock)) {
        console.log('invalid block structure: %s', JSON.stringify(newBlock));
        return false;
    }
    if (previousBlock.index + 1 !== newBlock.index) {
        console.log('invalid index');
        return false;
    }
    else if (previousBlock.hash !== newBlock.previousHash) {
        console.log('invalid previoushash');
        return false;
    }
    else if (!isValidTimestamp(newBlock, previousBlock)) {
        console.log('invalid timestamp');
        return false;
    }
    else if (!hasValidHash(newBlock)) {
        return false;
    }
    return true;
};
const setUnspentTxOuts = (newUnspentTxOut) => {
    console.log('replacing unspentTxouts with: %s', newUnspentTxOut);
    unspentTxOuts = newUnspentTxOut;
};
const addBlockToChain = (newBlock) => {
    if (isValidNewBlock(newBlock, getLastestBlock())) {
        const retVal = processTransactions(newBlock.data, getUnspentTxOuts(), newBlock.index);
        if (retVal === null) {
            console.log('block is not valid in terms of transactions');
            return false;
        }
        else {
            blockchain.push(newBlock);
            setUnspentTxOuts(retVal);
            (0, transactionPool_1.updateTransactionPool)(unspentTxOuts);
            return true;
        }
    }
    return false;
};
exports.addBlockToChain = addBlockToChain;
const isValidChain = (blockchainToValidate) => {
    console.log('isValidChain:');
    console.log(JSON.stringify(blockchainToValidate));
    const isValidGenesis = (block) => {
        return JSON.stringify(block) === JSON.stringify(genesisBlock);
    };
    if (!isValidGenesis(blockchainToValidate[0])) {
        return null;
    }
    let aUnspentTxOuts = [];
    for (let i = 0; i < blockchainToValidate.length; i++) {
        const currentBlock = blockchainToValidate[i];
        if (i !== 0 && !isValidNewBlock(blockchainToValidate[i], blockchainToValidate[i - 1])) {
            return null;
        }
        aUnspentTxOuts = processTransactions(currentBlock.data, aUnspentTxOuts, currentBlock.index);
        if (aUnspentTxOuts === null) {
            console.log('invalid transactions in blockchain');
            return null;
        }
    }
    return aUnspentTxOuts;
};
const getAccumulatedDifficulty = (aBlockchain) => {
    return aBlockchain
        .map((block) => block.difficulty)
        .map((difficulty) => Math.pow(2, difficulty))
        .reduce((a, b) => a + b);
};
const replaceChain = (newBlocks) => {
    const aUnspentTxOuts = isValidChain(newBlocks);
    const validChain = aUnspentTxOuts !== null;
    if (validChain &&
        getAccumulatedDifficulty(newBlocks) > getAccumulatedDifficulty(getBlockchain())) {
        console.log('Received blockchain is valid. Replacing current blockchain with received blockchain');
        blockchain = newBlocks;
        setUnspentTxOuts(aUnspentTxOuts);
        (0, transactionPool_1.updateTransactionPool)(unspentTxOuts);
        (0, p2p_1.broadcastLatest)();
    }
    else {
        console.log('Received blockchain invalid');
    }
};
exports.replaceChain = replaceChain;
//# sourceMappingURL=blockchain.js.map