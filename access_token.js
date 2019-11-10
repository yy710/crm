const axios = require('axios');
const config = require('./config.json');

/* function _getNewAccessToken(corpid) {
    return function (corpsecret) {
        return function (collection) {
            return axios
                .get(`https://qyapi.weixin.qq.com/cgi-bin/gettoken?corpid=${config.corpid}&corpsecret=${config.referredSecret}`)
                .then(r => {
                    const access_token = r.access_token;
                })
                .catch();
        }
    };
} 
const getNewAccessToken = _getNewAccessToken(config.corpid);
const getReferredAccessToken = getNewAccessToken(config.referredSecret);
getReferredAccessToken(col); */

class AccessToken {
    constructor(corpid, corpsecret, col) {
        this.corpid = corpid;
        this.corpsecret = corpsecret;
        this.col = col;
        this.access_token = {};
    }


    findInCache(){

    }

    find() {
        if (this.access_token) {

            return this.access_token
        };
        return this.col
            .find({ corpsecret: this.corpsecret })
            .next()
            .catch(err => console.log(err));
    }

    get() {
        this._find().then(this._checkout);
    }

    _checkout(p) {
        p.then(r => {
            if (r.access_token) return false;
            else if ((new Date()).getTime() - r.timestamp >= r.expire) return false;
            else this.set(r.access_token);

        })
    }
}

module.exports = AccessToken;