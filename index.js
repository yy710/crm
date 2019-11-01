const express = require('express');
const http = require('http');
const https = require('https');
const fs = require('fs');
const config = require('./config.json');

const app = express();
const router = express.Router();
const httpServer = http.createServer(app);

app.use(function (req, res, next) {
    //console.log(req.query);
    next();
});
app.use(express.static('public'))

const httpsServer = https.createServer({
    key: fs.readFileSync(config.keyFile),
    cert: fs.readFileSync(config.certFile)
}, app);
httpsServer.listen(config.httpsPort, function () {
    console.log('https server is running on port ', port);
});

httpServer.on('error', onError);
httpServer.on('listening', onListening);
httpServer.listen(config.httpPort);

/**
 * Event listener for HTTP server "error" event.
 */
function onError(error) {
    if (error.syscall !== 'listen') {
        throw error;
    }

    let bind = typeof port === 'string' ?
        'Pipe ' + port :
        'Port ' + port;

    // handle specific listen errors with friendly messages
    switch (error.code) {
        case 'EACCES':
            console.error(bind + ' requires elevated privileges');
            process.exit(1);
            break;
        case 'EADDRINUSE':
            console.error(bind + ' is already in use');
            process.exit(1);
            break;
        default:
            throw error;
    }
}

/**
 * Event listener for HTTP server "listening" event.
 */
function onListening() {
    let addr = server.address();
    let bind = typeof addr === 'string' ?
        'pipe ' + addr :
        'port ' + addr.port;
    //debug('Listening on ' + bind);
    console.log('Http server is listening on ' + bind);
}