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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const app = (0, express_1.default)();
const httpPort = parseInt(process.env.HTTP_PORT || "") || 3001;
const p2pPort = parseInt(process.env.P2P_PORT || "") || 6001;
app.get('/', function (req, res) {
    res.send('Hello World');
});
const bodyParser = __importStar(require("body-parser"));
const blockchain_1 = require("./blockchain");
const wallet_1 = require("./wallet");
const transactionPool_1 = require("./transactionPool");
const p2p_1 = require("./p2p");
const initHttpServer = (httpPort) => {
    const app = (0, express_1.default)();
    app.use(bodyParser.json());
    app.get('/blocks', (req, res) => {
        res.send((0, blockchain_1.getBlockchain)());
    });
    app.get('/block/:hash', (req, res) => {
        const block = (0, blockchain_1.getBlockchain)().find((block) => block.hash = req.params.hash);
        res.send(block);
    });
    app.get('/transaction/:id', (req, res) => {
        const blockchain = (0, blockchain_1.getBlockchain)();
        let tx = null;
        for (let block of blockchain) {
            let tx = block.data.find((blockTx) => blockTx.id == req.params.id);
            if (tx != null) {
                break;
            }
        }
        res.send(tx);
    });
    app.get('/address/:address', (req, res) => {
        const unspentTxOuts = (0, blockchain_1.getUnspentTxOuts)().filter((uTxO) => uTxO.address === req.params.address);
        res.send({ 'unspentTxOuts': unspentTxOuts });
    });
    app.get('/unspentTransactionOutputs', (req, res) => {
        res.send((0, blockchain_1.getUnspentTxOuts)());
    });
    app.get('/myUnspentTransactionOutputs', (req, res) => {
        res.send((0, wallet_1.getMyUnspentTransactionOutputs)());
    });
    app.post('/mineRawBlock', (req, res) => {
        if (req.body.data == null) {
            res.send('data parameter is missing');
            return;
        }
        const newBlock = (0, blockchain_1.generateRawNextBlock)(req.body.data);
        if (newBlock === null) {
            res.status(400).send('could not generate block');
        }
        else {
            res.send(newBlock);
        }
    });
    app.post('/mineBlock', (req, res) => {
        const newBlock = (0, blockchain_1.generateNextBlock)();
        if (newBlock === null) {
            res.status(400).send('could not generate block');
        }
        else {
            res.send(newBlock);
        }
    });
    app.get('/balance', (req, res) => {
        const balance = (0, wallet_1.getAccountBalance)();
        res.send({ 'balance': balance });
    });
    app.post('/mineTransaction', (req, res) => {
        const address = req.body.address;
        const amount = req.body.amount;
        try {
            const resp = (0, blockchain_1.generateNextBlockWithTransaction)(address, amount);
            res.send(resp);
        }
        catch (e) {
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
            const resp = (0, blockchain_1.sendTransaction)(address, amount);
            res.send(resp);
        }
        catch (e) {
            console.log(e.message);
            res.status(400).send(e.message);
        }
    });
    app.get('/transactionPool', (req, res) => {
        res.send((0, transactionPool_1.getTransactionPool)());
    });
    app.post('/stop', (req, res) => {
        res.send({ 'msg': 'stopping server' });
        process.exit();
    });
    app.listen(httpPort, () => {
        console.log('Listening http on port: ' + httpPort);
    });
};
initHttpServer(httpPort);
(0, p2p_1.initP2PServer)(p2pPort);
//# sourceMappingURL=main.js.map