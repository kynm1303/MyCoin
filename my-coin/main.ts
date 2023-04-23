import express from "express";

const app = express();
const httpPort: number = parseInt(process.env.HTTP_PORT || "") || 3001;
const p2pPort: number = parseInt(process.env.P2P_PORT || "") || 6001;

app.get('/', function (req, res) {
    res.send('Hello World')
})

import * as bodyParser from 'body-parser';
import { Block, generateNextBlock, generateNextBlockWithTransaction, generateRawNextBlock, getBlockchain, getUnspentTxOuts, sendTransaction } from "./blockchain";
import { get } from "http";
import { Transaction, UnspentTxOut } from "./transaction";
import { createTransaction, getAccountBalance, getMyUnspentTransactionOutputs, getPrivateFromWallet } from "./wallet";
import { addToTransactionPool, getTransactionPool } from "./transactionPool";
import { initP2PServer } from "./p2p";

const initHttpServer = (httpPort: number) => {
    const app = express();
    app.use(bodyParser.json());    
    
    app.get('/blocks', (req, res) => {
        res.send(getBlockchain());
    });

    app.get('/block/:hash', (req, res) => {
        const block = getBlockchain().find((block) => block.hash = req.params.hash);
        res.send(block);
    });

    app.get('/transaction/:id', (req, res) => {
        const blockchain = getBlockchain();
        let tx: Transaction = null;
        for (let block of blockchain) {
            let tx = block.data.find((blockTx) => blockTx.id == req.params.id)
            if (tx != null) {
                break;
            }
        }
        res.send(tx);
    });

    app.get('/address/:address', (req, res) => {
        const unspentTxOuts: UnspentTxOut[] =
            getUnspentTxOuts().filter((uTxO) => uTxO.address === req.params.address);
        res.send({'unspentTxOuts': unspentTxOuts});
    });

    app.get('/unspentTransactionOutputs', (req, res) => {
        res.send(getUnspentTxOuts());
    });

    app.get('/myUnspentTransactionOutputs', (req, res) => {
        res.send(getMyUnspentTransactionOutputs());
    });

    app.post('/mineRawBlock', (req, res) => {
        if (req.body.data == null) {
            res.send('data parameter is missing');
            return;
        }
        const newBlock: Block = generateRawNextBlock(req.body.data);
        if (newBlock === null) {
            res.status(400).send('could not generate block');
        } else {
            res.send(newBlock);
        }
    });

    
    app.post('/mineBlock', (req, res) => {
        const newBlock: Block = generateNextBlock();
        if (newBlock === null) {
            res.status(400).send('could not generate block');
        } else {
            res.send(newBlock);
        }
    });

    app.get('/balance', (req, res) => {
        const balance: number = getAccountBalance();
        res.send({'balance': balance});
    });

    app.post('/mineTransaction', (req, res) => {
        const address = req.body.address;
        const amount = req.body.amount;
        try {
            const resp = generateNextBlockWithTransaction(address, amount);
            res.send(resp);
        } catch (e) {
            console.log(e.message);
            res.status(400).send(e.message);
        }
    });

    app.post('/sendTransaction', (req, res) => {
        try {
            const address = req.body.address;
            const amount = req.body.amount;

            if (address === undefined || amount === undefined) {
                throw Error('invalid address or amount');
            }
            const resp = sendTransaction(address, amount);
            res.send(resp);
        } catch (e) {
            console.log(e.message);
            res.status(400).send(e.message);
        }
    });
    
    app.get('/transactionPool', (req, res) => {
        res.send(getTransactionPool());
    });

    app.post('/stop', (req, res) => {
        res.send({'msg' : 'stopping server'});
        process.exit();
    });

    app.listen(httpPort, () => {
        console.log('Listening http on port: ' + httpPort);
    });
}

initHttpServer(httpPort);
initP2PServer(p2pPort);