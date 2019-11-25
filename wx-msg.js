//const querystring = require('querystring');
//const axios = require('axios');
//const fs = require('fs');
//const crypto = require('crypto');
const xml2js = require('xml2js');
const config = require('./config.json');
const msgAPI = require('./api_crypto');
//console.log(typeof (msgAPI));
msgAPI.initCrypto(config.corpid, config.token, config.encodingAESKey);

/**
 * 验证URL有效性
 * 当点击“保存”提交以上信息时，企业微信会发送一条验证消息到填写的URL，发送方法为GET。
 * 企业的接收消息服务器接收到验证请求后，需要作出正确的响应才能通过URL验证。
 */
function replyEchostr() {
  return (req, res, next) => {
    console.log("req.query: ", req.query);
    const query = req.query;
    const
      signature = query.msg_signature,
      timestamp = query.timestamp,
      nonce = query.nonce,
      echostr = query.echostr;

    const s = msgAPI.rawSignature(timestamp, nonce, echostr);
    console.log("msgAPI.rawSignature(): ", s);

    if (s == signature) {
      // 如果验证成功则对 echostr 解密后返回 msg 字段
      let echo = msgAPI.decrypt(echostr);
      console.log("msgAPI.decrypt", echo);
      //const echo = JSON.parse(echo);
      res.send(echo);
    } else {
      console.log("check msg_signature fail!");
      res.send({
        status: 400,
        data: "check msg error"
      })
    }
  }
};

function handleMsg() {
  return (req, res, next) => {
    //console.log("req.body: ", req.body);
    let xml = msgAPI.decrypt(req.body.xml.encrypt[0]);
    //console.log("msgAPI.decrypt(): ", xml);
    xml2js.parseStringPromise(xml /*, options */)
      .then(function (result) {
        //console.dir(result.xml);
        req.data.post = getArray0(result.xml);
        console.log("req.data.post: ", req.data.post);
        next();
      })
      .catch(function (err) {
        // Failed
      });

    res.send({ status: 200, data: "success" });
  };
}

module.exports = {
  replyEchostr,
  handleMsg
};

function temp() {
  //var xml2js = require('xml2js');

  const parser = new xml2js.Parser(/* options */);
  parser.parseStringPromise(xml).then(function (result) {
    console.dir(result);
    console.log('Done');
  })
    .catch(function (err) {
      // Failed
    });

  const obj = { name: "Super", Surname: "Man", age: 23 };
  const builder = new xml2js.Builder();
  const xml = builder.buildObject(obj);
}

function getArray0(defaults) {
  let newObject = {};
  for (var key in defaults) {
    newObject[key] = defaults[key][0];
  }
  return newObject;
}