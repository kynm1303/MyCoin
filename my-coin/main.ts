import express from "express";

const app = express();
const httpPort: number = parseInt(process.env.HTTP_PORT || "") || 3001;

app.get('/', function (req, res) {
    res.send('Hello World')
})

app.listen(httpPort, () => {
    console.log('Listening http on port: ' + httpPort);
});