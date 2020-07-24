const axios = require('axios');
const assert = require('assert');

function getUserInfoFromCode() {
  // need req.data.access_token, req.data.url, export req.data.user
  return function (req, res, next) {
    const { access_token, url } = req.data;
    const code = req.query.code || new URL(url).searchParams.get('code');
    console.log({ code });

    if (!code) {
      next();
    } else {
      assert.notEqual(null, access_token);
      // 获取用户身份
      axios
        .get(`https://qyapi.weixin.qq.com/cgi-bin/user/getuserinfo?access_token=${access_token}&code=${code}`)
        .then(r => {
          // doc https://work.weixin.qq.com/api/doc/90000/90135/91023
          //assert.equal(0, r.data.errcode);
          //console.log("code2user: ", r.data);
          if(r.data.errcode)next();
          // 读取成员
          return axios.get(`https://qyapi.weixin.qq.com/cgi-bin/user/get?access_token=${access_token}&userid=${r.data.UserId}`);
        })
        .then(r => {
          // doc https://work.weixin.qq.com/api/doc/90000/90135/90196
          //console.log("getUserInfo: ", r.data);
          //assert.equal(0, r.data.errcode);
          if(r.data.errcode)next();
          const { userid, name, mobile, thumb_avatar } = r.data;
          req.data.user = { userid, name, mobile, thumb_avatar };
          next();
        })
        .catch(err => console.log(err));
    }
  };
}

module.exports = { getUserInfoFromCode };
