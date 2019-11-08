const assert = require('assert');
const express = require('express');
const http = require('http');
const https = require('https');
const fs = require('fs');
const MongoClient = require('mongodb').MongoClient;
const config = require('./config.json');

const app = express();
const routerYz = require('./routers/yz')(express);
const httpServer = http.createServer(app);

app.use(function (req, res, next) {
    //console.log(req.query);
    req.data = {};
    next();
});
app.use(express.static('public'))
app.use('/yz', initDb(config.crmDbUrl), routerYz);

/* const httpsServer = https.createServer({
    key: fs.readFileSync(config.keyFile),
    cert: fs.readFileSync(config.certFile)
}, app);
httpsServer.listen(config.httpsPort, function () {
    console.log('https server is running on port ', config.httpsPort);
}); */

httpServer.on('error', onError);
httpServer.on('listening', onListening);
httpServer.listen(config.httpPort);

const json1 = {
    potential_customer: { id: 1, name: "关羽", phone: "13768667656" },
    dispatch_employ: { id: 5, name: "赵云", phone: "12565678767" },
    from_customer: { id: 6, name: "刘备", phone: "12565767876" },
    source_type: "转介绍",
    state: "new",
    tracks: [
        {
            action: "create",
            update_time: new Date(),
            operator: { id: 12, name: "张飞", phone: "13812567656" },
            data: {}
        }
    ]
};

class Referred {
    constructor(data = {}) {
        /* this.potential_customer = { id: 1, name: "关羽", phone: "13768667656" };
        this.dispatch_employ = { id: 5, name: "赵云", phone: "12565678767" };
        this.from_customer = { id: 6, name: "刘备", phone: "12565767876" };
        this.source_type = "转介绍";
        this.state = "new";
        this.tracks = [
            {
                action: "create",
                update_time: new Date(),
                operator: { id: 12, name: "张飞", phone: "13812567656" },
                data: {}
            }
        ]; */

        this.data = data;
        this.actions = {};
        this.mutations = {
            accept: () => {
                this.data.tracks.push({
                    action: "accept",
                    update_time: new Date(),
                    operator: { id: 11, name: "马超", phone: "111" },
                    data: this.data
                });
                this.state = "accept";
            }
        };
    }

    dispatch() {

    }

    commit(mutation) {
        
    }

    show() {
        console.log(JSON.stringify(this.data, null, 4));
    }

    get() {

    }
}

const rf = new Referred(json1);
rf.show();
/**
 * middleware for mongodb
 * @param dbUrl
 * @returns {Function} req.data.db
 */
function initDb(dbUrl) {
    return function (req, res, next) {
        // static method
        MongoClient.connect(dbUrl, { useUnifiedTopology: true }, function (err, client) {
            assert.equal(null, err);
            console.log("Connected successfully to mongodb server");
            req.data.db = client.db();
            next();
            //client.close();
        });

        /* // Connection URL
        const url = 'mongodb://localhost:27017';
        // Database Name
        const dbName = 'myproject';
        // Create a new MongoClient
        const client = new MongoClient(url);
        // Use connect method to connect to the Server
        client.connect(function (err) {
            assert.equal(null, err);
            console.log("Connected successfully to server");
            const db = client.db(dbName);
            client.close();
        }); */
    };
}

/**
 * Event listener for HTTP server "error" event.
 */
function onError(error) {
    if (error.syscall !== 'listen') {
        throw error;
    }

    let bind = typeof port === 'string' ?
        'Pipe ' + config.httpPort :
        'Port ' + config.httpPort;

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
    let addr = httpServer.address();
    let bind = typeof addr === 'string' ?
        'pipe ' + addr :
        'port ' + addr.port;
    //debug('Listening on ' + bind);
    console.log('Http server is listening on ' + bind);
}