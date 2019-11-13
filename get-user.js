const axios = require('axios');
const assert = require('assert');

function getUserInfoFromCode() {
    return function (req, res, next) {
        const code = req.query.code;
        if (!code)
            next();
        else
            axios.get(`https://qyapi.weixin.qq.com/cgi-bin/user/getuserinfo?access_token=${global.token.access_token}&code=${code}`)
                .then(result => {
                    console.log("axios.get(1): ", result.data);
                    assert.equal(0, result.data.errcode);
                    return axios.get(`https://qyapi.weixin.qq.com/cgi-bin/user/get?access_token=${global.token.access_token}&userid=${result.data.UserId}`);
                })
                .then(result => {
                    console.log("axios.get(2): ", result.data);
                    assert.equal(0, result.data.errcode);
                    req.data.employer = result.data;
                    next();
                })
                .catch(err => console.log(err));
    }
};

module.exports = getUserInfoFromCode;