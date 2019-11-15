const querystring = require('querystring');
const axios = require('axios');
//const request = require('request');
//const {app, pushToken} = require('../config/wx_config');
//const {result} = require('./result');
const fs = require('fs');
const crypto = require('crypto');
//const multer = require('multer');
//const {join} = require('path');
//const { sha1, decrypt } = require('./utils');
const utils = require('./utils');
//const ZY = require('../module/init');
const config = require('./config.json');
const aes = require('wx-ding-aes');
const msgAPI = require('./api_crypto');
console.log(typeof (msgAPI));
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
      let echo = utils.decrypt({ AESKey: config.encodingAESKey, text: echostr, corpid: config.corpid });
      console.log("msgAPI.decrypt", echo);
      //const echo = JSON.parse();
      res.send(echo.msg);
    } else {
      console.log("check msg_signature fail!");
      res.send({
        status: 400,
        data: "check msg error"
      })
    }
  }
};

/**
 *  消息体验证和解密
    客服接收到的消息
    handle_customer_sevice
 */
/* exports.handleCustomerServer = (req, res) => {
  console.log('接收到了消息，请求体中');
  console.log(req.body);
  console.log('接收到了消息，请求url中');
  console.log(req.query);
  let signature = req.query.signature,
    timestamp = req.query.timestamp,
    nonce = req.query.nonce,
    openid = req.query.openid,
    encrypt_type = req.query.encrypt_type,
    msg_signature = req.query.msg_signature,
    msg_encrypt = req.body.Encrypt; // 密文体

  // 开发者计算签名
  let devMsgSignature = sha1(config.token, timestamp, nonce, msg_encrypt);

  if (devMsgSignature == msg_signature) {
    console.log('验证成功,是从微信服务器转发过来的消息');

    let returnObj = decrypt({
      AESKey: config.server.EncodingAESKey,
      text: msg_encrypt,
      corpid: config.app.appId
    });
    console.log('解密后的消息');
    console.log(returnObj);
    console.log('解密后的消息内容');
    const decryptMessage = JSON.parse(returnObj.msg);
    console.log(decryptMessage);
  } else {
    console.log('error');
    res.send('error');
  }
}; */

/**
 * 此处方法解析的是微信消息加密 XML 格式的
 *
 * 过程介绍为
 * 1. 先拿到消息 URL 中的字符串，并且拿到消息体中的密文体
 * 2. 对 URL 和 密文体 进行微信方面提供的加密方法验证是否等于消息体签名，验证消息是否为微信转发过来的
 * 3. 第 2 步验证成功之后，对微信消息进行解密，解密函数在工具函数中
 *
 * URL地址中的内容
 *
 * @params {String} signature      签名串
 * @params {String} timestamp      时间戳
 * @params {String} nonce          随机串
 * @params {String} encrypt_type   加密类型（aes）
 * @params {String} openid
 * @params {String} msg_signature  消息体签名.用于验证消息体的正确性
 *
 * 请求体中的内容 -- 解析后
 * @params {String} tousername    小程序的原始id
 * @params {String} encrypt       加密后的消息字符串
 *
 */
/* exports.handleCustomerServerXML = (req, res) => {
  console.log('接收到了请求url中');
  console.log(req.query);
  console.log('接收到了请求，请求体中');
  console.log(req.body);
  const { signature, timestamp, nonce, encrypt_type, openid, msg_signature } = req.query;
  const msg_encrypt = req.body.xml.encrypt[0];

  // 验证消息的正确性
  const dev_msg_signature = sha1(config.pushToken, timestamp, nonce, msg_encrypt);
  if (dev_msg_signature == msg_signature) {
    // 签名消息正确,来自微信服务器 解密
    const lastData = utils.decryptXML({
      AESKey: config.server.EncodingAESKey,
      text: msg_encrypt,
      corpid: config.app.appId
    });
    console.log('msg函数中接收到的数据内容');

    console.log(lastData);
    console.log('收到的消息为 --------- ' + lastData.msg.xml.Content[0]);

    var msgArr = {
      '新年好': '你TM新年也好啊',
      '值班': '老子今天不上班，你值你m呢',
      '你好': '你好',
      '什么': '你在说什么呢？',
      '哦': '你好啊',
      '多好': '是的额'
    };
    var replyMsg = msgArr[lastData.msg.xml.Content[0]];
    if (replyMsg) {
      ZY.msg.textMsg(openid, openid, replyMsg)
        .then(res => {
          console.log('消息发送成功！');
          console.log(res);
        })
        .catch(err => {
          console.log('消息发送失败');
          console.log(err);
        })
    } else {
      ZY.msg.textMsg(openid, openid, '你瞧瞧你说的是人话吗？')
        .then(res => {
          console.log('消息发送成功！');
          console.log(res);
        })
        .catch(err => {
          console.log('消息发送失败');
          console.log(err);
        })
    }
    res.send('success');
  } else {
    console.log('非微信服务器试图发送消息给我！！');
    res.send('你在玩啥呢？？');
  }
} */

module.exports = {
  replyEchostr
};