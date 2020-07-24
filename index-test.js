// 载入 npm 模块
const assert = require('assert');
const express = require('express');
const bodyParser = require('body-parser');
const http = require('http');
const xmlparser = require('express-xml-bodyparser');
const axios = require('axios');
//const https = require('https');
//const fs = require('fs');
const cors = require('cors');
const MongoClient = require('mongodb').MongoClient;
// 载入配置文件
global.config = config = require('./config.json');

// const EventEmitter = require('events');
// class LogEmitter extends EventEmitter {}
// global.logEmitter = new LogEmitter();

const schedule = require('node-schedule');
const j1 = scheduleAxiosGet('*/1 8-18 * * *', 'http://localhost/yz/referred/cron/minute5');
const j2 = scheduleAxiosGet({ hour: [9, 17], minute: 0 }, 'http://localhost/yz/referred/cron/everyday');

if (global.config.debug) {
  j1.cancel();
  j2.cancel();
}

// 载入自定义模块

// 创建 http 服务
const app = express();
const httpServer = http.createServer(app);
// 允许跨域访问
app.use(cors());
// post data to req.body
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
// work weixin post xml data to req.body
app.use(xmlparser());
app.use(function (req, res, next) {
  global.config.debug && console.log('req.originalUrl: ', req.originalUrl);
  req.data = {};
  req.data.config = global.config;
  next();
});
app.use(express.static('public'));

// 引入 crm 路由
const routerYz = require('./routers/yz')(express);
app.use('/yz', initDb(config.crmDbUrl), routerYz);

const routerExam = require('./routers/exam');
app.use('/exam', routerExam);

// 监听服务端口
httpServer.on('error', onError);
httpServer.on('listening', onListening);
httpServer.listen(8080);

function scheduleAxiosGet(dateParams, url) {
  const job = schedule.scheduleJob(dateParams, function (date) {
    axios
      .get(url)
      .then(r => global.config.debug && console.log('scheduleJob start at: %s\n axios.get %s :\n%s', date, url, JSON.stringify(r.data, null, 4)))
      .catch(err => console.log(err));
  });
  return job;
}

/**
 * middleware for mongodb
 */
function initDb(dbUrl) {
  return function (req, res, next) {
    // static method
    MongoClient.connect(dbUrl, { useUnifiedTopology: true }, function (err, client) {
      assert.equal(null, err);
      console.log('Connected successfully to mongodb server');
      req.data.db = client.db();
      next();
    });
  };
}

/**
 * Event listener for HTTP server "error" event.
 */
function onError(error) {
  if (error.syscall !== 'listen') {
    throw error;
  }

  let bind = typeof port === 'string' ? 'Pipe ' + config.httpPort : 'Port ' + config.httpPort;

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
  let bind = typeof addr === 'string' ? 'pipe ' + addr : 'port ' + addr.port;
  //debug('Listening on ' + bind);
  console.log('Http server is listening on ' + bind);
}
