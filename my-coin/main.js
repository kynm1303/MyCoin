"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const app = (0, express_1.default)();
const httpPort = parseInt(process.env.HTTP_PORT || "") || 3001;
app.get('/', function (req, res) {
    res.send('Hello World');
});
app.listen(httpPort, () => {
    console.log('Listening http on port: ' + httpPort);
});
//# sourceMappingURL=main.js.map