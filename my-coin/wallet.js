"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteWallet = exports.initWallet = exports.generatePrivateKey = exports.getBalance = exports.getPrivateFromWallet = exports.getPublicFromWallet = exports.createTransaction = void 0;
const elliptic_1 = __importDefault(require("elliptic"));
const fs_1 = require("fs");
const transaction_1 = require("./transaction");
const EC = new elliptic_1.default.ec("secp256k1");
const privateKeyLocation = "node/wallet/private_key.txt";
const getPrivateFromWallet = () => {
    const buffer = (0, fs_1.readFileSync)(privateKeyLocation, "utf8");
    return buffer.toString();
};
exports.getPrivateFromWallet = getPrivateFromWallet;
const getPublicFromWallet = () => {
    const privateKey = getPrivateFromWallet();
    const keyPair = EC.keyFromPrivate(privateKey, "hex");
    return keyPair.getPublic().encode("hex", true);
    ;
};
exports.getPublicFromWallet = getPublicFromWallet;
const generatePrivateKey = () => {
    const keyPair = EC.genKeyPair();
    const privateKey = keyPair.getPrivate();
    return privateKey.toString(16);
};
exports.generatePrivateKey = generatePrivateKey;
const initWallet = () => {
    if (!(0, fs_1.existsSync)(privateKeyLocation))
        return;
    const newPrivateKey = generatePrivateKey();
    (0, fs_1.writeFileSync)(privateKeyLocation, newPrivateKey, "utf8");
    console.log('new wallet with private key created to: %s', privateKeyLocation);
};
exports.initWallet = initWallet;
const deleteWallet = () => {
    if ((0, fs_1.existsSync)(privateKeyLocation)) {
        (0, fs_1.unlinkSync)(privateKeyLocation);
    }
};
exports.deleteWallet = deleteWallet;
const getBalance = (address, unspentTxOuts) => {
    return unspentTxOuts.filter(txOut => txOut.address == address)
        .map((txOut => txOut.amount))
        .reduce((a, b) => a + b, 0);
};
exports.getBalance = getBalance;
const findTxOutsForAmount = (amount, myUnspentTxOuts) => {
    let currentAmount = 0;
    const includedTxOuts = [];
    for (let txOut of myUnspentTxOuts) {
        currentAmount += txOut.amount;
        includedTxOuts.push(txOut);
        if (currentAmount > amount) {
            const leftOverAmount = amount - currentAmount;
            return { includedTxOuts, leftOverAmount };
        }
    }
    throw Error("not enough amount for transaction");
};
const createUnsignedTxIn = (txOuts) => {
    return new transaction_1.TxIn(txOuts.txOutId, txOuts.txOutIndex, '');
};
const createTxOuts = (receiverAddress, myAddress, amount, leftOverAmount) => {
    const txOut1 = new transaction_1.TxOut(receiverAddress, amount);
    if (leftOverAmount == 0) {
        return [txOut1];
    }
    else {
        return [txOut1, new transaction_1.TxOut(myAddress, leftOverAmount)];
    }
};
const createTransaction = (receiverAddress, privateKey, amount, unspentTxOuts) => {
    const myAddress = (0, transaction_1.getPublicKey)(privateKey);
    const myUnspentTxOuts = unspentTxOuts.filter(txOut => txOut.address == myAddress);
    const { includedTxOuts, leftOverAmount } = findTxOutsForAmount(amount, myUnspentTxOuts);
    const unsignedTxIns = myUnspentTxOuts.map(txOut => createUnsignedTxIn(txOut));
    const tx = new transaction_1.Transaction();
    tx.txIns = unsignedTxIns;
    tx.txOuts = createTxOuts(receiverAddress, myAddress, amount, leftOverAmount);
    tx.id = (0, transaction_1.generateTransactionId)(tx);
    tx.txIns = tx.txIns.map((txIn, index) => {
        txIn.signature = (0, transaction_1.signTxIn)(tx, index, privateKey, unspentTxOuts);
        return txIn;
    });
    return tx;
};
exports.createTransaction = createTransaction;
//# sourceMappingURL=wallet.js.map