"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPublicKey = exports.generateTransactionId = exports.signTxIn = exports.TxOut = exports.TxIn = exports.UnspentTxOut = exports.Transaction = exports.genesisTransaction = void 0;
const CryptoJS = __importStar(require("crypto-js"));
const ecdsa = __importStar(require("elliptic"));
const ec = new ecdsa.ec('secp256k1');
const COINBASE_AMOUNT = 50;
class TxIn {
    constructor(txOutId, txOutIndex, signature) {
        this.txOutId = txOutId;
        this.txOutIndex = txOutIndex;
        this.signature = signature;
    }
}
exports.TxIn = TxIn;
class TxOut {
    constructor(address, amount) {
        this.address = address;
        this.amount = amount;
    }
}
exports.TxOut = TxOut;
class Transaction {
}
exports.Transaction = Transaction;
const genesisTransaction = new Transaction();
exports.genesisTransaction = genesisTransaction;
genesisTransaction.txIns = [new TxIn('', 0, '')];
genesisTransaction.txOuts = [new TxOut("04bfcab8722991ae774db48f934ca79cfb7dd991229153b9f732ba5334aafcd8e7266e47076996b55a14bf9913ee3145ce0cfc1372ada8ada74bd287450313534a", 50)];
genesisTransaction.id = 'e655f6a5f26dc9b4cac6e46f52336428287759cf81ef5ff10854f69d68f43fa3';
const generateTransactionId = (transaction) => {
    const txInContent = transaction.txIns
        .map((txIn) => txIn.txOutId + txIn.txOutIndex)
        .reduce((a, b) => a + b, '');
    const txOutContent = transaction.txOuts
        .map((txOut) => txOut.address + txOut.amount)
        .reduce((a, b) => a + b, '');
    return CryptoJS.SHA256(txInContent + txOutContent).toString();
};
exports.generateTransactionId = generateTransactionId;
class UnspentTxOut {
    constructor(txOutId, txOutIndex, address, amount) {
        this.txOutId = txOutId;
        this.txOutIndex = txOutIndex;
        this.address = address;
        this.amount = amount;
    }
}
exports.UnspentTxOut = UnspentTxOut;
let unspentTxOuts = [];
const findUnspentTxOut = (unspentTxOuts, txOutIndex, txOutId) => {
    return unspentTxOuts.find((unspentTxOut) => unspentTxOut.txOutId == txOutId && unspentTxOut.txOutIndex == txOutIndex);
};
const getPublicKey = (aPrivateKey) => {
    return ec.keyFromPrivate(aPrivateKey, 'hex').getPublic().encode('hex', true);
};
exports.getPublicKey = getPublicKey;
const toHexString = (byteArray) => {
    return Array.from(byteArray, (byte) => {
        return ('0' + (byte & 0xFF).toString(16)).slice(-2);
    }).join('');
};
const signTxIn = (transaction, txInIndex, privateKey, aUnspentOutputs) => {
    const txIn = transaction.txIns[txInIndex];
    const key = ec.keyFromPrivate(privateKey, 'hex');
    const dataToSign = transaction.id;
    const referencedTxOut = findUnspentTxOut(aUnspentOutputs, txIn.txOutIndex, txIn.txOutId);
    if (referencedTxOut == null) {
        console.log('could not find referenced txOut');
        throw Error();
    }
    if (getPublicKey(privateKey) !== referencedTxOut.address) {
        console.log('trying to sign an input with private' +
            ' key that does not match the address that is referenced in txIn');
        throw Error();
    }
    const signature = toHexString(key.sign(dataToSign).toDER());
    return signature;
};
exports.signTxIn = signTxIn;
const validateTxIn = (txIn, transaction, aUnspentTxOuts) => {
    const referencedUTxOut = findUnspentTxOut(aUnspentTxOuts, txIn.txOutIndex, txIn.txOutId);
    if (referencedUTxOut == null) {
        console.log('referenced txOut not found: ' + JSON.stringify(txIn));
        return false;
    }
    const address = referencedUTxOut.address;
    const key = ec.keyFromPublic(address, 'hex');
    const validSignature = key.verify(transaction.id, txIn.signature);
    if (!validSignature) {
        console.log('invalid txIn signature: %s txId: %s address: %s', txIn.signature, transaction.id, referencedUTxOut.address);
        return false;
    }
    return true;
};
const updateUnspentTxOuts = (newTransactions, aUnspentTxOuts) => {
    const newUnspentTxOuts = newTransactions
        .map((t) => {
        return t.txOuts.map((txOut, index) => new UnspentTxOut(t.id, index, txOut.address, txOut.amount));
    })
        .reduce((a, b) => a.concat(b), []);
    const consumedTxOuts = newTransactions
        .map((t) => t.txIns)
        .reduce((a, b) => a.concat(b), [])
        .map((txIn) => new UnspentTxOut(txIn.txOutId, txIn.txOutIndex, '', 0));
    const resultingUnspentTxOuts = aUnspentTxOuts
        .filter(((uTxO) => !findUnspentTxOut(consumedTxOuts, uTxO.txOutIndex, uTxO.txOutId)))
        .concat(newUnspentTxOuts);
    return resultingUnspentTxOuts;
};
const isValidTxInStructure = (txIn) => {
    if (txIn == null) {
        console.log('txIn is null');
        return false;
    }
    else if (typeof txIn.signature !== 'string') {
        console.log('invalid signature type in txIn');
        return false;
    }
    else if (typeof txIn.txOutId !== 'string') {
        console.log('invalid txOutId type in txIn');
        return false;
    }
    else if (typeof txIn.txOutIndex !== 'number') {
        console.log('invalid txOutIndex type in txIn');
        return false;
    }
    else {
        return true;
    }
};
const isValidAddress = (address) => {
    if (address.length !== 130) {
        console.log(address);
        console.log('invalid public key length');
        return false;
    }
    else if (address.match('^[a-fA-F0-9]+$') === null) {
        console.log('public key must contain only hex characters');
        return false;
    }
    else if (!address.startsWith('04')) {
        console.log('public key must start with 04');
        return false;
    }
    return true;
};
const isValidTxOutStructure = (txOut) => {
    if (txOut == null) {
        console.log('txOut is null');
        return false;
    }
    else if (typeof txOut.address !== 'string') {
        console.log('invalid address type in txOut');
        return false;
    }
    else if (!isValidAddress(txOut.address)) {
        console.log('invalid TxOut address');
        return false;
    }
    else if (typeof txOut.amount !== 'number') {
        console.log('invalid amount type in txOut');
        return false;
    }
    else {
        return true;
    }
};
const isValidTransactionStructure = (transaction) => {
    if (typeof transaction.id !== 'string') {
        console.log('transactionId missing');
        return false;
    }
    if (!(transaction.txIns instanceof Array)) {
        console.log('invalid txIns type in transaction');
        return false;
    }
    if (!transaction.txIns
        .map(isValidTxInStructure)
        .reduce((a, b) => (a && b), true)) {
        return false;
    }
    if (!(transaction.txOuts instanceof Array)) {
        console.log('invalid txIns type in transaction');
        return false;
    }
    if (!transaction.txOuts
        .map(isValidTxOutStructure)
        .reduce((a, b) => (a && b), true)) {
        return false;
    }
    return true;
};
const getTxInAmount = function (txIn, unspentTxOuts) {
    const referencedTxOut = findUnspentTxOut(unspentTxOuts, txIn.txOutIndex, txIn.txOutId);
    if (referencedTxOut == null) {
        console.log('referenced txOut not found: ' + JSON.stringify(txIn));
        return 0;
    }
    return referencedTxOut.amount;
};
const validateTransaction = (transaction, aUnspentTxOuts) => {
    if (!isValidTransactionStructure(transaction)) {
        return false;
    }
    if (generateTransactionId(transaction) !== transaction.id) {
        console.log('invalid tx id: ' + transaction.id);
        return false;
    }
    const hasValidTxIns = transaction.txIns
        .map((txIn) => validateTxIn(txIn, transaction, aUnspentTxOuts))
        .reduce((a, b) => a && b, true);
    if (!hasValidTxIns) {
        console.log('some of the txIns are invalid in tx: ' + transaction.id);
        return false;
    }
    const totalTxInValues = transaction.txIns
        .map((txIn) => getTxInAmount(txIn, aUnspentTxOuts))
        .reduce((a, b) => (a + b), 0);
    const totalTxOutValues = transaction.txOuts
        .map((txOut) => txOut.amount)
        .reduce((a, b) => (a + b), 0);
    if (totalTxOutValues !== totalTxInValues) {
        console.log('totalTxOutValues !== totalTxInValues in tx: ' + transaction.id);
        return false;
    }
    return true;
};
const validateCoinbaseTx = (transaction, blockIndex) => {
    if (generateTransactionId(transaction) !== transaction.id) {
        console.log('invalid coinbase tx id: ' + transaction.id);
        return false;
    }
    if (transaction.txIns.length !== 1) {
        console.log('one txIn must be specified in the coinbase transaction');
        return false;
    }
    if (transaction.txIns[0].txOutIndex !== blockIndex) {
        console.log('the txIn index in coinbase tx must be the block height');
        return false;
    }
    if (transaction.txOuts.length !== 1) {
        console.log('invalid number of txOuts in coinbase transaction');
        return false;
    }
    if (transaction.txOuts[0].amount != COINBASE_AMOUNT) {
        console.log('invalid coinbase amount in coinbase transaction');
        return false;
    }
    return true;
};
const getCoinBaseTransactionId = (txOutAddress, blockIndex) => {
    const signature = '';
    const txOutId = '';
    const txOutIndex = blockIndex;
    const txIn = new TxIn(txOutId, txOutIndex, signature);
    const txOut = new TxOut(txOutAddress, COINBASE_AMOUNT);
    const coinbaseTransaction = new Transaction();
    coinbaseTransaction.id = generateTransactionId(coinbaseTransaction);
    coinbaseTransaction.txIns = [txIn];
    coinbaseTransaction.txOuts = [txOut];
    return coinbaseTransaction;
};
const checkForDuplicates = (txIns) => {
    for (let i = 0; i < txIns.length; i++) {
        for (let j = i + 1; j < txIns.length; j++) {
            if (txIns[i].txOutId == txIns[j].txOutId && txIns[i].txOutIndex == txIns[j].txOutIndex)
                return true;
        }
    }
    return false;
};
const validateBlockTransactions = (transactions, unspentTxOuts, blockIndex) => {
    const coinbaseTx = transactions[0];
    if (!validateCoinbaseTx(coinbaseTx, blockIndex)) {
        console.log("invalid coinbase transaction");
        return false;
    }
    const txIns = (transactions).map((t) => {
        return t.txIns;
    }).reduce((a, b) => a.concat(b), []);
    if (checkForDuplicates(txIns)) {
        return false;
    }
    const normalTransactions = transactions.slice(1);
    return normalTransactions.map((tx) => validateTransaction(tx, unspentTxOuts))
        .reduce((a, b) => a && b, true);
};
//# sourceMappingURL=transaction.js.map