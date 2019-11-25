const axios = require('axios');
const assert = require('assert');

function getUserInfoFromCode() {
    /**
     * need req.query.code
     * export req.data.user
     */
    return function (req, res, next) {
        const code = req.query.code;
        if (!code)
            next();
        else
            // 获取用户身份
            axios.get(`https://qyapi.weixin.qq.com/cgi-bin/user/getuserinfo?access_token=${global.token.access_token}&code=${code}`)
                .then(result => {
                    //console.log("axios.get(1): ", result.data);
                    /**
                     * result.data = {
                       "errcode": 0,
                       "errmsg": "ok",
                       "UserId":"USERID",
                       "DeviceId":"DEVICEID"
                       }
                     */
                    assert.equal(0, result.data.errcode);
                    // 读取成员
                    return axios.get(`https://qyapi.weixin.qq.com/cgi-bin/user/get?access_token=${global.token.access_token}&userid=${result.data.UserId}`);
                })
                .then(result => {
                    //console.log("axios.get(2): ", result.data);
                    /** https://work.weixin.qq.com/api/doc#90000/90135/90196
                     * {
    "errcode": 0,
    "errmsg": "ok",
    "userid": "zhangsan",
    "name": "李四",
    "department": [1, 2],
    "order": [1, 2],
    "position": "后台工程师",
    "mobile": "15913215421",
    "gender": "1",
    "email": "zhangsan@gzdev.com",
    "is_leader_in_dept": [1, 0],
    "avatar": "http://wx.qlogo.cn/mmopen/ajNVdqHZLLA3WJ6DSZUfiakYe37PKnQhBIeOQBO4czqrnZDS79FH5Wm5m4X69TBicnHFlhiafvDwklOpZeXYQQ2icg/0",
    "thumb_avatar": "http://wx.qlogo.cn/mmopen/ajNVdqHZLLA3WJ6DSZUfiakYe37PKnQhBIeOQBO4czqrnZDS79FH5Wm5m4X69TBicnHFlhiafvDwklOpZeXYQQ2icg/100",
    "telephone": "020-123456",
}
                     */
                    assert.equal(0, result.data.errcode);
                    //const user = { userid, name, mobile, avatar, thumb_avatar } = result.data;
                    req.data.user = result.data;
                    next();
                })
                .catch(err => console.log(err));
    }
};

module.exports = getUserInfoFromCode;