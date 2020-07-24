const axios = require('axios');
const assert = require('assert');

module.exports = { };

function find() {
    return function (req, res, next) {
        if (global.token) {
            req.data.saveToken = false;
            //console.log("find token in global:", global.token);
            next();
        }
        else req.data.db.collection('tokens')
            .find({ agentid: req.data.config.agentid })
            .next()
            .then(doc => {
                //console.log("find token in db: ", doc);
                global.token = doc;
                next();
            })
            .catch(err => console.log(err));
    };
}

function checkout() {
    return function (req, res, next) {
        if (global.token) {
            const diffTime = new Date().getTime() - global.token.time;
            if (diffTime >= global.token.expires_in * 1000) {
                console.log("token expired!");
                global.token = null;
            }
        }
        next();
    };
}

function getNewToken() {
    return (req, res, next) => {
        if (global.token) next();
        else {
            axios.get(`https://qyapi.weixin.qq.com/cgi-bin/gettoken?corpid=${req.data.config.corpid}&corpsecret=${req.data.config.referred.secret}`)
                .then(result => {
                    console.log("axios.get(): ", result.data);
                    assert.equal(0, result.data.errcode);
                    let token = result.data;
                    token.agentid = req.data.config.referred.agentid;
                    token.time = new Date().getTime();
                    global.token = token;
                    req.data.saveToken = true;
                    next();
                }).catch(err => console.log(err));
        }
    };
}

function saveToDb() {
    return (req, res, next) => {
        if (req.data.saveToken)
            req.data.db.collection('tokens').replaceOne({ agentid: req.data.config.referred.agentid }, global.token, { upsert: 1 }).catch(err => console.log("saved to db err: ", err));
        next();
    };
}