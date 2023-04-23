"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleReceivedTransaction = exports.updateTransactionPool = exports.addToTransactionPool = exports.getTransactionPool = void 0;
const blockchain_1 = require("./blockchain");
const transaction_1 = require("./transaction");
let transactionPool = [];
const getTransactionPool = () => {
    return transactionPool;
};
exports.getTransactionPool = getTransactionPool;
const addToTransactionPool = (tx, unspentTxOuts) => {
    if (!(0, transaction_1.validateTransaction)(tx, unspentTxOuts)) {
        throw Error('Trying to add invalid tx to pool');
    }
    if (!isValidTxForPool(tx, transactionPool)) {
        throw Error('Trying to add invalid tx to pool');
    }
    console.log('adding to txPool: %s', JSON.stringify(tx));
    transactionPool.push(tx);
};
exports.addToTransactionPool = addToTransactionPool;
const getTxPoolIns = (aTransactionPool) => {
    return (aTransactionPool).map((t) => {
        return t.txIns;
    }).reduce((a, b) => a.concat(b), []);
};
const isValidTxForPool = (tx, aTtransactionPool) => {
    const txPoolIns = getTxPoolIns(aTtransactionPool);
    const containsTxIn = (txIns, txIn) => {
        return txPoolIns.find((txPoolIn) => {
            return txIn.txOutIndex === txPoolIn.txOutIndex && txIn.txOutId === txPoolIn.txOutId;
        });
    };
    for (const txIn of tx.txIns) {
        if (containsTxIn(txPoolIns, txIn)) {
            console.log('txIn already found in the txPool');
            return false;
        }
    }
    return true;
};
const hasTxIn = (txIn, unspentTxOuts) => {
    const foundTxIn = unspentTxOuts.find((uTxO) => {
        return uTxO.txOutId === txIn.txOutId && uTxO.txOutIndex === txIn.txOutIndex;
    });
    return foundTxIn !== undefined;
};
const updateTransactionPool = (unspentTxOuts) => {
    const invalidTxs = [];
    for (const tx of transactionPool) {
        for (const txIn of tx.txIns) {
            if (!hasTxIn(txIn, unspentTxOuts)) {
                invalidTxs.push(tx);
                break;
            }
        }
    }
    if (invalidTxs.length > 0) {
        console.log('removing the following transactions from txPool: %s', JSON.stringify(invalidTxs));
        transactionPool = transactionPool.filter(t => invalidTxs.indexOf(t) == -1);
    }
};
exports.updateTransactionPool = updateTransactionPool;
const handleReceivedTransaction = (transaction) => {
    addToTransactionPool(transaction, (0, blockchain_1.getUnspentTxOuts)());
};
exports.handleReceivedTransaction = handleReceivedTransaction;
//# sourceMappingURL=transactionPool.js.map