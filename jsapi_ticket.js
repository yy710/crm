const axios = require('axios');
const assert = require('assert');

module.exports = {
    find() {
        return function (req, res, next) {
            if (global.jsapi_ticket) {
                req.data.saveTicket = false;
                console.log("find ticket in global:", global.jsapi_ticket);
                next();
            }
            else req.data.db.collection('jsapi_ticket')
                .find({ corpid: req.data.config.corpid })
                .next()
                .then(doc => {
                    console.log("find ticket in db: ", doc);
                    global.jsapi_ticket = doc;
                    next();
                })
                .catch(err => console.log(err));
        };
    },

    checkout() {
        return function (req, res, next) {
            if (global.jsapi_ticket) {
                const diffTime = new Date().getTime() - global.jsapi_ticket.time;
                if (diffTime >= global.jsapi_ticket.expires_in * 1000) {
                    console.log("token expired!");
                    global.jsapi_ticket = null;
                }
            }
            next();
        };
    },

    getNewTicket() {
        return (req, res, next) => {
            if (global.jsapi_ticket) next();
            else {
                assert.equal(null, global.jsapi_ticket);
                axios.get(`https://qyapi.weixin.qq.com/cgi-bin/get_jsapi_ticket?access_token=${global.token.access_token}`)
                    .then(result => {
                        console.log("axios.get(): ", result.data);
                        assert.equal(0, result.data.errcode);
                        let jsapi_ticket = result.data;
                        jsapi_ticket.corpid = req.data.config.corpid;
                        jsapi_ticket.time = new Date().getTime();
                        global.jsapi_ticket = jsapi_ticket;
                        req.data.saveTicket = true;
                        next();
                    }).catch(err => console.log(err));
            }
        };
    },

    saveToDb() {
        return (req, res, next) => {
            if (req.data.saveTicket)
                req.data.db.collection('jsapi_ticket').replaceOne({ corpid: req.data.config.corpid }, global.jsapi_ticket, { upsert: 1 }).catch(err => console.log("saved to db err: ", err));
            next();
        };
    }
};