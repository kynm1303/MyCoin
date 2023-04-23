import ecdsa from 'elliptic';
import { existsSync, readFileSync, unlinkSync, writeFileSync } from 'fs';
import { Transaction, TxIn, TxOut, UnspentTxOut, generateTransactionId, getPublicKey, signTxIn } from './transaction';
import { getUnspentTxOuts } from './blockchain';

const EC = new ecdsa.ec("secp256k1");

const privateKeyLocation = "node/wallet/private_key.txt";

const getPrivateFromWallet = (): string => {
    const buffer = readFileSync(privateKeyLocation, "utf8");
    return buffer.toString();
}

const getPublicFromWallet = (): string => {
    const privateKey: string = getPrivateFromWallet();
    const keyPair = EC.keyFromPrivate(privateKey, "hex");
    return keyPair.getPublic().encode("hex", true);;
}

const generatePrivateKey = (): string => {
    const keyPair = EC.genKeyPair();
    const privateKey = keyPair.getPrivate();
    return privateKey.toString(16);
}

const initWallet = () => {
    if (!existsSync(privateKeyLocation))
        return;
    const newPrivateKey = generatePrivateKey();
    writeFileSync(privateKeyLocation, newPrivateKey, "utf8");
    console.log('new wallet with private key created to: %s', privateKeyLocation);
}

const deleteWallet = () => {
    if (existsSync(privateKeyLocation)) {
        unlinkSync(privateKeyLocation);
    }
}

const getBalance = (address: string, unspentTxOuts: UnspentTxOut[]): number => {
    return unspentTxOuts.filter(txOut => txOut.address == address)
        .map((txOut => txOut.amount))
        .reduce((a, b) => a + b, 0);
}

// gets the unspent transaction outputs owned by the wallet
const getMyUnspentTransactionOutputs = () => {
    return findUnspentTxOuts(getPublicFromWallet(), getUnspentTxOuts());
};

const findUnspentTxOuts = (ownerAddress: string, unspentTxOuts: UnspentTxOut[]) => {
    return unspentTxOuts.filter((uTxO: UnspentTxOut) => uTxO.address === ownerAddress);
};

const findTxOutsForAmount = (amount: number, myUnspentTxOuts: UnspentTxOut[]) => {
    let currentAmount = 0;
    const includedTxOuts = [];
    for (let txOut of myUnspentTxOuts) {
        currentAmount += txOut.amount;
        includedTxOuts.push(txOut);
        if (currentAmount > amount) {
            const leftOverAmount = amount - currentAmount;
            return {includedTxOuts, leftOverAmount}
        }
    }
    throw Error("not enough amount for transaction");
}

const createUnsignedTxIn = (txOuts: UnspentTxOut): TxIn => {
    return new TxIn(txOuts.txOutId, txOuts.txOutIndex, '');
}

const createTxOuts = (receiverAddress: string, myAddress: string, amount: number, leftOverAmount: number) => {
    const txOut1: TxOut = new TxOut(receiverAddress, amount);
    if (leftOverAmount == 0) {
        return [txOut1];
    } else {
        return [txOut1, new TxOut(myAddress, leftOverAmount)];
    }
}

const filterTxPoolTxs = (unspentTxOuts: UnspentTxOut[], transactionPool: Transaction[]): UnspentTxOut[] => {
    const txIns: TxIn[] = transactionPool.map((tx: Transaction) => tx.txIns).reduce((a, b) => a.concat(b), []);
    const removable: UnspentTxOut[] = [];
    for (const unspentTxOut of unspentTxOuts) {
        const txIn = txIns.find((aTxIn: TxIn) => {
            return aTxIn.txOutIndex === unspentTxOut.txOutIndex && aTxIn.txOutId === unspentTxOut.txOutId;
        });

        if (txIn === undefined) {

        } else {
            removable.push(unspentTxOut);
        }
    }

    return unspentTxOuts.filter((txOut) => (removable.indexOf(txOut) != -1));
};

const createTransaction = (receiverAddress: string, amount: number, privateKey: string, unspentTxOuts: UnspentTxOut[], txPool: Transaction[]): Transaction => {

    const myAddress: string = getPublicKey(privateKey);
    const myUnspentTxOutsA = unspentTxOuts.filter(txOut => txOut.address == myAddress);
    const myUnspentTxOuts = filterTxPoolTxs(myUnspentTxOutsA, txPool);
    const {includedTxOuts, leftOverAmount} = findTxOutsForAmount(amount, myUnspentTxOuts);

    const unsignedTxIns: TxIn[] = myUnspentTxOuts.map(txOut => createUnsignedTxIn(txOut));
    
    const tx: Transaction = new Transaction();
    tx.txIns = unsignedTxIns;
    tx.txOuts = createTxOuts(receiverAddress, myAddress, amount, leftOverAmount);
    tx.id = generateTransactionId(tx);

    tx.txIns = tx.txIns.map((txIn, index) => {
        txIn.signature = signTxIn(tx, index, privateKey, unspentTxOuts);
        return txIn;
    });

    return tx;
}

const getAccountBalance = (): number => {
    return getBalance(getPublicFromWallet(), getUnspentTxOuts());
};

export {
    createTransaction,
    getPublicFromWallet,
    getPrivateFromWallet,
    getBalance,
    generatePrivateKey,
    initWallet,
    deleteWallet,
    getMyUnspentTransactionOutputs,
    getAccountBalance
}