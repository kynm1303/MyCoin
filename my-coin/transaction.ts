import * as CryptoJS from "crypto-js";
import * as ecdsa from 'elliptic';

const ec = new ecdsa.ec('secp256k1');
const COINBASE_AMOUNT: number = 50;

class TxIn {
    public txOutId!: string;
    public txOutIndex!: number;
    public signature!: string;
    constructor(txOutId: string, txOutIndex: number, signature: string) {
        this.txOutId = txOutId;
        this.txOutIndex = txOutIndex;
        this.signature = signature;
    }
}

class TxOut {
    public address: string;
    public amount: number;
    constructor(address: string, amount: number) {
        this.address = address;
        this.amount = amount;
    }
}

class Transaction {

    public id!: string;

    public txIns!: TxIn[];
    public txOuts!: TxOut[];


}


const genesisTransaction = new Transaction();
genesisTransaction.txIns = [new TxIn('', 0, '')]
genesisTransaction.txOuts = [new TxOut(
    "04bfcab8722991ae774db48f934ca79cfb7dd991229153b9f732ba5334aafcd8e7266e47076996b55a14bf9913ee3145ce0cfc1372ada8ada74bd287450313534a",
    50
)]
genesisTransaction.id = 'e655f6a5f26dc9b4cac6e46f52336428287759cf81ef5ff10854f69d68f43fa3';

const generateTransactionId = (transaction: Transaction): string => {
    const txInContent: string = transaction.txIns
        .map((txIn: TxIn) => txIn.txOutId + txIn.txOutIndex)
        .reduce((a, b) => a + b, '');

    const txOutContent: string = transaction.txOuts
        .map((txOut: TxOut) => txOut.address + txOut.amount)
        .reduce((a, b) => a + b, '');

    return CryptoJS.SHA256(txInContent + txOutContent).toString();
};

class UnspentTxOut {
    public readonly txOutId: string;
    public readonly txOutIndex: number;
    public readonly address: string;
    public readonly amount: number;

    constructor(txOutId: string,
        txOutIndex: number,
        address: string,
        amount: number) {
        this.txOutId = txOutId;
        this.txOutIndex = txOutIndex;
        this.address = address;
        this.amount = amount;
    }
}
let unspentTxOuts: UnspentTxOut[] = [];

const findUnspentTxOut = (unspentTxOuts: UnspentTxOut[], txOutIndex: number, txOutId: string) => {
    return unspentTxOuts.find(
        (unspentTxOut: UnspentTxOut) => unspentTxOut.txOutId == txOutId && unspentTxOut.txOutIndex == txOutIndex
    );
}


const getPublicKey = (aPrivateKey: string): string => {
    return ec.keyFromPrivate(aPrivateKey, 'hex').getPublic().encode('hex', true);
};

const toHexString = (byteArray: any[]): string => {
    return Array.from(byteArray, (byte: any) => {
        return ('0' + (byte & 0xFF).toString(16)).slice(-2);
    }).join('');
};

const signTxIn = (transaction: Transaction, txInIndex: number,
    privateKey: string, aUnspentOutputs: UnspentTxOut[]) => {
    const txIn: TxIn = transaction.txIns[txInIndex];
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
    const signature: string = toHexString(key.sign(dataToSign).toDER());
    return signature;
}

const validateTxIn = (txIn: TxIn, transaction: Transaction, aUnspentTxOuts: UnspentTxOut[]): boolean => {
    const referencedUTxOut = findUnspentTxOut(aUnspentTxOuts, txIn.txOutIndex, txIn.txOutId);
    if (referencedUTxOut == null) {
        console.log('referenced txOut not found: ' + JSON.stringify(txIn));
        return false;
    }
    const address = referencedUTxOut.address;

    const key = ec.keyFromPublic(address, 'hex');
    const validSignature: boolean = key.verify(transaction.id, txIn.signature);
    if (!validSignature) {
        console.log('invalid txIn signature: %s txId: %s address: %s', txIn.signature, transaction.id, referencedUTxOut.address);
        return false;
    }
    return true;
};

const updateUnspentTxOuts = (newTransactions: Transaction[], aUnspentTxOuts: UnspentTxOut[]): UnspentTxOut[] => {
    const newUnspentTxOuts: UnspentTxOut[] = newTransactions
        .map((t) => {
            return t.txOuts.map((txOut, index) => new UnspentTxOut(t.id, index, txOut.address, txOut.amount));
        })
        .reduce((a, b) => a.concat(b), []);

    const consumedTxOuts: UnspentTxOut[] = newTransactions
        .map((t) => t.txIns)
        .reduce((a, b) => a.concat(b), [])
        .map((txIn) => new UnspentTxOut(txIn.txOutId, txIn.txOutIndex, '', 0));

    const resultingUnspentTxOuts = aUnspentTxOuts
        .filter(((uTxO) => !findUnspentTxOut(consumedTxOuts, uTxO.txOutIndex, uTxO.txOutId)))
        .concat(newUnspentTxOuts);

    return resultingUnspentTxOuts;
};

const isValidTxInStructure = (txIn: TxIn): boolean => {
    if (txIn == null) {
        console.log('txIn is null');
        return false;
    } else if (typeof txIn.signature !== 'string') {
        console.log('invalid signature type in txIn');
        return false;
    } else if (typeof txIn.txOutId !== 'string') {
        console.log('invalid txOutId type in txIn');
        return false;
    } else if (typeof txIn.txOutIndex !== 'number') {
        console.log('invalid txOutIndex type in txIn');
        return false;
    } else {
        return true;
    }
};

// valid address is a valid ecdsa public key in the 04 + X-coordinate + Y-coordinate format
const isValidAddress = (address: string): boolean => {
    if (address.length !== 130) {
        console.log(address);
        console.log('invalid public key length');
        return false;
    } else if (address.match('^[a-fA-F0-9]+$') === null) {
        console.log('public key must contain only hex characters');
        return false;
    } else if (!address.startsWith('04')) {
        console.log('public key must start with 04');
        return false;
    }
    return true;
};

const isValidTxOutStructure = (txOut: TxOut): boolean => {
    if (txOut == null) {
        console.log('txOut is null');
        return false;
    } else if (typeof txOut.address !== 'string') {
        console.log('invalid address type in txOut');
        return false;
    } else if (!isValidAddress(txOut.address)) {
        console.log('invalid TxOut address');
        return false;
    } else if (typeof txOut.amount !== 'number') {
        console.log('invalid amount type in txOut');
        return false;
    } else {
        return true;
    }
};

const isValidTransactionStructure = (transaction: Transaction) => {
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

const getTxInAmount = function (txIn: TxIn, unspentTxOuts: UnspentTxOut[]) {
    const referencedTxOut = findUnspentTxOut(unspentTxOuts, txIn.txOutIndex, txIn.txOutId);
    if (referencedTxOut == null) {
        console.log('referenced txOut not found: ' + JSON.stringify(txIn));
        return 0;
    }
    return referencedTxOut.amount;
}

const validateTransaction = (transaction: Transaction, aUnspentTxOuts: UnspentTxOut[]): boolean => {

    if (!isValidTransactionStructure(transaction)) {
        return false;
    }

    if (generateTransactionId(transaction) !== transaction.id) {
        console.log('invalid tx id: ' + transaction.id);
        return false;
    }
    const hasValidTxIns: boolean = transaction.txIns
        .map((txIn) => validateTxIn(txIn, transaction, aUnspentTxOuts))
        .reduce((a, b) => a && b, true);

    if (!hasValidTxIns) {
        console.log('some of the txIns are invalid in tx: ' + transaction.id);
        return false;
    }

    const totalTxInValues: number = transaction.txIns
        .map((txIn) => getTxInAmount(txIn, aUnspentTxOuts))
        .reduce((a, b) => (a + b), 0);

    const totalTxOutValues: number = transaction.txOuts
        .map((txOut) => txOut.amount)
        .reduce((a, b) => (a + b), 0);

    if (totalTxOutValues !== totalTxInValues) {
        console.log('totalTxOutValues !== totalTxInValues in tx: ' + transaction.id);
        return false;
    }

    return true;
};

const validateCoinbaseTx = (transaction: Transaction, blockIndex: number): boolean => {
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

const getCoinBaseTransactionId = (txOutAddress: string, blockIndex: number) => {
    const signature = '';
    const txOutId = '';
    const txOutIndex = blockIndex;
    const txIn: TxIn = new TxIn(txOutId, txOutIndex, signature);

    const txOut: TxOut = new TxOut(txOutAddress, COINBASE_AMOUNT);

    const coinbaseTransaction = new Transaction();
    coinbaseTransaction.id = generateTransactionId(coinbaseTransaction);
    coinbaseTransaction.txIns = [txIn];
    coinbaseTransaction.txOuts = [txOut];

    return coinbaseTransaction;
}

const checkForDuplicates = (txIns: TxIn[]): boolean => {
    for (let i = 0; i < txIns.length; i++) {
        for (let j = i + 1; j < txIns.length; j++) {
            if (txIns[i].txOutId == txIns[j].txOutId && txIns[i].txOutIndex == txIns[j].txOutIndex)
                return true;
        }
    }
    return false;
}

const validateBlockTransactions = (transactions: Transaction[], unspentTxOuts: UnspentTxOut[], blockIndex: number): boolean => {
    const coinbaseTx = transactions[0];
    if (!validateCoinbaseTx(coinbaseTx, blockIndex)) {
        console.log("invalid coinbase transaction");
        return false;
    }
    const txIns: TxIn[] = (transactions).map((t) => {
        return t.txIns;
    }).reduce((a, b) => a.concat(b), []);

    if (checkForDuplicates(txIns)) {
        return false;
    }

    const normalTransactions: Transaction[] = transactions.slice(1);
    return normalTransactions.map((tx) => validateTransaction(tx, unspentTxOuts))
        .reduce((a, b) => a && b, true);
}

export { genesisTransaction,
    Transaction, UnspentTxOut,
    TxIn, TxOut, signTxIn, generateTransactionId,
    getPublicKey
}