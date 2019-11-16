const axios = require('axios');
const assert = require('assert');
const config = require('./config.json');

function _sentNotice() {
    assert.notEqual(null, global.token.access_token);
    let taskCard = {
        //"touser": "YuChunJian",
        //"toparty": "PartyID1|PartyID2",
        //"totag": "TagID1 | TagID2",
        //"msgtype": "text",
        "agentid": config.referred.agentid
    };
    return axios.post(`https://qyapi.weixin.qq.com/cgi-bin/message/send?access_token=${global.token.access_token}`, taskCard)
        .then(log("sentNotic: "))
        .catch(error => console.log(error));
}

function log(text) {
    return r => {
        console.log(text, r);
        return Promise.resolve(r);
    };
}