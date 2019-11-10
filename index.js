// 载入 npm 模块
const assert = require('assert');
const express = require('express');
const http = require('http');
//const https = require('https');
//const fs = require('fs');
const cors = require('cors');
const MongoClient = require('mongodb').MongoClient;
const axios = require('axios');

// 载入配置文件
const config = require('./config.json');

// 载入自定义模块
const AccessToken = require('./access_token.js');
const Referred = require('./referred.js');

// 创建 http 服务
const app = express();
const httpServer = http.createServer(app);
// 允许跨域访问
app.use(cors());
app.use(function (req, res, next) {
    //console.log(req.query);
    req.data = {};
    next();
});
app.use(express.static('public'))

// 初始化 crm 系统全局变量
let crmDb = {};
let referredAccessToken = {};
initDb(config.crmDbUrl, db => {
    crmDb = db;
    referredAccessToken = new AccessToken(config.corpid, config.referredSecret, crmDb.collection('access_tokens'));
});

// 引入 crm 路由
const routerYz = require('./routers/yz')(express);
app.use('/yz', (req, res, next) => {
    req.data.db = crmDb;
    req.data.accessToken = referredAccessToken;
    next();
}, routerYz);

/* const httpsServer = https.createServer({
    key: fs.readFileSync(config.keyFile),
    cert: fs.readFileSync(config.certFile)
}, app);
httpsServer.listen(config.httpsPort, function () {
    console.log('https server is running on port ', config.httpsPort);
}); */

// 监听服务端口
httpServer.on('error', onError);
httpServer.on('listening', onListening);
httpServer.listen(config.httpPort);

/**
 * middleware for mongodb
 * @param dbUrl
 * @returns {Function} req.data.db
 */
function initDb(dbUrl, callback) {
    // static method
    MongoClient.connect(dbUrl, { useUnifiedTopology: true }, function (err, client) {
        assert.equal(null, err);
        console.log("Connected successfully to mongodb server");
        callback(client.db());
        //client.close();
    });
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