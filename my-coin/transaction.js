"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Transaction = exports.genesisTransaction = void 0;
const crypto_js_1 = __importDefault(require("crypto-js"));
const elliptic_1 = __importDefault(require("elliptic"));
const ec = new elliptic_1.default.ec('secp256k1');
class TxIn {
    constructor(txOutId, txOutIndex, signature) {
        this.txOutId = txOutId;
        this.txOutIndex = txOutIndex;
        this.signature = signature;
    }
}
class TxOut {
    constructor(address, amount) {
        this.address = address;
        this.amount = amount;
    }
}
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
    return crypto_js_1.default.SHA256(txInContent + txOutContent).toString();
};
class UnspentTxOut {
    constructor(txOutId, txOutIndex, address, amount) {
        this.txOutId = txOutId;
        this.txOutIndex = txOutIndex;
        this.address = address;
        this.amount = amount;
    }
}
const findUnspentTxOut = (unspentTxOuts, txOutIndex, txOutId) => {
    return unspentTxOuts.find((unspentTxOut) => unspentTxOut.txOutId == txOutId && unspentTxOut.txOutIndex == txOutIndex);
};
const getPublicKey = (aPrivateKey) => {
    return ec.keyFromPrivate(aPrivateKey, 'hex').getPublic().encode('hex', true);
};
const signTxIn = (transaction, txInIndex, privateKey, aUnspentOutputs) => {
    const txIn = transaction.txIns[txInIndex];
    const key = ec.keyFromPrivate(privateKey, 'hex');
    const referencedTxOut = findUnspentTxOut(aUnspentOutputs, txIn.txOutIndex, txIn.txOutId);
    if (referencedTxOut == null) {
        console.log('could not find referenced txOut');
        throw Error();
    }
    if (getPublicKey(privateKey) !== referencedTxOut.address) {
    }
};
