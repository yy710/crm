'use strict';

/**
 * 初始化数据库参数
 */
const MongoClient = require('mongodb').MongoClient;
const assert = require('assert');
const excel = require('./excel.js');
// Connection URL
const dbUrl = require('./config.js').dbUrl;
console.log(dbUrl);
// Create a new MongoClient
const client = new MongoClient(dbUrl, { useNewUrlParser: true });

// Use connect method to connect to the Server
client.connect(function (err) {
    assert.equal(null, err);
    console.log("Connected successfully to server");
    const db = client.db();
    //write data to mongodb
    //excel.xlsxToDb('./sfrf-users.xlsx', db, 'usersfromxlsx');
    client.close();
});