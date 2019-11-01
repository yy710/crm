const assert = require('assert');
let express = require('express');
const MongoClient = require('mongodb').MongoClient;
const config = require('./config.js');
const routerXWY = require("./xwy/index.js");
let http = require('http');
//let https = require('https');
let fs = require('fs');
const cors = require('cors');

const app = express();
//app.use(cors());
//const dbUrl = config.dbUrl;
//const client = new MongoClient(dbUrl, { useNewUrlParser: true });
/**
 * Get port from environment and store in Express.
 */
//let port = normalizePort(process.env.PORT || '80');
const port = 2019;
app.set('port', port);

/**
 * Create HTTP server.
 */
let server = http.createServer(app);

/**
 * Listen on provided port, on all network interfaces.
 */
server.listen(port);
server.on('error', onError);
server.on('listening', onListening);

//app.use(express.static('../public'));
app.use(function (req, res, next) {
    req.data = {};
    next();
});

app.use('/xwy', initDb(config.dbUrl), routerXWY(express));

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

/**
 * middleware for mongodb
 * @param dbUrl
 * @returns {Function} req.data.db
 */
function initDb(dbUrl) {
    return function (req, res, next) {
        // static method
        MongoClient.connect(dbUrl, { useNewUrlParser: true }, function (err, client) {
            assert.equal(null, err);
            console.log("Connected successfully to server");
            req.data.db = client.db();
            next();
        });
    };
}

function mergeOptions(options, defaults) {
    for (var key in defaults) {
        options[key] = options[key] || defaults[key];
    }
}