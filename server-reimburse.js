const assert = require('assert');
const express = require('express');
//const bodyParser = require('body-parser');
const http = require('http');
//const xmlparser = require('express-xml-bodyparser');
//const axios = require('axios');
const config = require('./config.json');
// 创建 http 服务
const app = express();
const httpServer = http.createServer(app);

app.use(function (req, res, next) {
  config.debug && console.log('req.originalUrl: ', req.originalUrl);
  req.data = {};
  req.data.config = global.config;
  //res.json({ errcode: 0, errmsg: 'success' });
  next();
});

const router = require('./routers/reimburse.js');
app.use('/reimburse', router);

httpServer.listen(3001, function () {
  console.log('server listening on 3001');
});
