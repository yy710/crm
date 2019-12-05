const axios = require('axios');
const assert = require('assert');
const config = require('./config.json');
const { mergeOptions } = require('./common');

exports.init = function (msg = {}) {
    assert.notEqual(null, global.token.access_token);
    this.access_token = global.token.access_token;

    const _msg = {
        "touser": config.referred.adminId,
        "agentid": global.config.referred.agentid,
        "enable_id_trans": 1
    }
    this.msg = mergeOptions(msg, _msg);
    return this;
};

exports.addToUser = function (user) {
    this.msg.touser += `|${user}`;
    return this;
};

exports.sentTextcard = function (textcard = {}) {
    const _textcard = {
        "title": "领奖通知",
        "description": "<div class=\"gray\">2016年9月26日</div> <div class=\"normal\">恭喜你抽中iPhone 7一台，领奖码：xxxx</div><div class=\"highlight\">请于2016年10月10日前联系行政同事领取</div>",
        "url": "http://www.all2key.cn",
        "btntxt": "更多"
    };
    this.msg.msgtype = "textcard";
    this.msg.textcard = mergeOptions(textcard, _textcard);
    return this.sendMsg();
};

exports.sentTaskcard = function (taskcard = {}) {
    const _taskcard = {
        "title": "赵明登的礼物申请",
        "description": "礼品：A31茶具套装<br>用途：赠与小黑科技张总经理",
        "url": "http://www.all2key.cn",
        "task_id": "taskid123",
        "btn": [
            {
                "key": "key111",
                "name": "批准",
                "replace_name": "已批准",
                "color": "red",
                "is_bold": true
            },
            {
                "key": "key222",
                "name": "驳回",
                "replace_name": "已驳回"
            }
        ]
    };
    this.msg.msgtype = "taskcard";
    this.msg.taskcard = mergeOptions(taskcard, _taskcard);
    return this.sendMsg();
};

exports.sendMarkdown = function (content = {}) {
    this.msg.msgtype = "markdown";
    this.msg.markdown = { content };
    return this.sendMsg();
};

exports.sendMsg = function () {
    return axios
        .post(`https://qyapi.weixin.qq.com/cgi-bin/message/send?access_token=${this.access_token}`, this.msg)
        .then(() => this.msg)
        .catch(error => console.log(error));
};