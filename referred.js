const axios = require('axios');
const assert = require('assert');
const config = require('./config.json');
const sentMsg = require('./sent-msg');

module.exports = {
    new() {
        return (req, res, next) => {
            // create new referred data
            req.data.referred = {
                // 识别ID， 16个字符随机字符串
                id: randomString(16),
                // 订单基础信息，通常不需要更改
                order: {
                    potential_customer: { id: 0, name: req.query.customerName, phone: req.query.customerPhone },
                    dispatch_employer: { id: 0, name: '', phone: '' },
                    from_customer: { id: 0, name: req.query.fromName, phone: req.query.fromPhone },
                    carType: req.query.carType,
                    source_type: req.query.source
                },
                // 订单当前状态
                state: "new",
                // 订单跟踪记录
                tracks: [{
                    action: "new",
                    update_time: new Date(),
                    operator: req.query.operator,
                    data: req.query
                }]
            };
            const textcard = {
                "title": "有新转介绍信息",
                "description": createDesc(req.data.referred),
                "url": `http://www.all2key.cn/dispatch.html?referredid=${req.data.referred.id}`,
                "btntxt": "指派顾问"
            };
            // write new referred to db and send textcard to dispatcher
            req.data.db.collection('referreds')
                .replaceOne({ "order.potential_customer.phone": req.data.referred.order.potential_customer.phone }, req.data.referred, { upsert: 1 })
                .then(r => sentMsg.init().sentTextcard(textcard))
                .then(r => next())
                .catch(err => console.log(err));
        };
    },
    dispatch() {
        return (req, res, next) => {
            console.log("req.query", req.query);
            const col = req.data.db.collection('referreds');
            // get admin info from adminId
            // write action "dispatch" to object of referred
            col.updateOne(
                { id: req.query.referredid },
                { $addToSet: { tracks: { action: "dispatch", update_time: new Date(), operator: { id: config.referred.adminId }, data: req.query } }, $set: { "order.dispatch_employer": req.query.employer, "state": "dispatched" } },
                { upsert: false })
                // get referred from referredid
                .then(r => col.findOne({ id: req.query.referredid }))
                .then(r => {
                    //const taskid = randomString();
                    const taskcard = {
                        "title": "收到指派的转介绍任务",
                        "description": createDesc(r),
                        "url": `http://www.all2key.cn/show-task.html?referredid=${req.query.referredid}&employerid=${req.query.employer.id}`,
                        "task_id": req.query.referredid,
                        "btn": [
                            {
                                "key": "accept",
                                "name": "点击接受任务",
                                "replace_name": "已接受任务",
                                "color": "red",
                                "is_bold": true
                            }
                        ]
                    };
                    // send taskcard to empoyer 
                    return sentMsg.init().sentTaskcard(taskcard);
                })
                .then(r => next())
                .catch(err => console.log(err));
        };
    },
    accept() {
        return (req, res, next) => {
            /** 
             * post data strcture
             * {
             *   ToUserName: [ 'ww29233ad949e808bf' ],
             *   FromUserName: [ 'YuChunJian' ],
             *   MsgType: [ 'event' ],
             *   Event: [ 'taskcard_click' ],
             *   CreateTime: [ '1574046122' ],
             *   EventKey: [ 'accept' ],
             *   TaskId: [ 'DZLwlNv8' ],
             *   AgentId: [ '1000003' ]
             * }
             */
            //const post = getArray0(req.data.post);
            const post = req.data.post;
            if (post.EventKey != 'accept' || post.Event != 'taskcard_click') next();
            else {
                const col = req.data.db.collection('referreds');
                console.log("handle accept!");
                col.updateOne(
                    { id: post.TaskId },
                    { $addToSet: { tracks: { action: "accept", update_time: new Date(), operator: { id: post.FromUserName }, data: post } }, $set: { "state": "accepted" } },
                    { upsert: false })
                    .catch(err => console.log(err))
            }
        };
    },
    commit() {
        return (req, res, next) => {
            /**
             * req.query
             *  { message: '好',
             * state: '1',
             * empolyerid: 'YuChunJian',
             * referredid: 'tJpO4tfReysQy7JU' }
             */
            const col = req.data.db.collection('referreds');
            col.updateOne(
                { id: req.query.referredid },
                { $addToSet: { tracks: { action: req.query.state, update_time: new Date(), operator: { id: req.query.employerid }, data: req.query } }, $set: { "state": req.query.state } },
                { upsert: false })
                // send msg to admin
                .then(r => {
                    const content = `转介绍订单状态变化通知 
                    >**订单详情** 
                    >客  户：<font color=\"info\">开会</font> 
                    >介绍人：@miglioguan 
                    >指派顾问：@miglioguan、@kunliu、@jamdeezhou、@kanexiong、@kisonwang 
                    >创建人：<font color=\"info\">广州TIT 1楼 301</font> 
                    >创建时间：<font color=\"warning\">2018年5月18日</font> 
                    现在状态为：
                    状态更新说明：
                    如需查询订单历史信息，请点击：[订单历史](https://work.weixin.qq.com)`;
                    return sentMsg.init().sendMarkdown(content);
                })
                .then(r => next())
                .catch(err => console.log(err))
        };
    },
    end() {
        return (req, res, next) => {

        };
    }
};

function randomString(length = 8) {
    const chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let result = '';
    for (var i = length; i > 0; --i) result += chars[Math.floor(Math.random() * chars.length)];
    return result;
}

// define textcard for dispatcher
function createDesc(ref) {
    const od = ref.order;
    const op = ref.tracks[0].operator;
    let desc = `<div class=\"gray\">${(new Date()).toLocaleDateString()}</div>`;
    desc += `<div class=\"highlight\">被介绍客户：${od.potential_customer.name}---${od.potential_customer.phone}</div>`;
    desc += `<div class=\"highlight\">意向车型：${od.carType || ''}</div>`;
    desc += `<div class=\"normal\">介绍人：${od.from_customer.name || ''}---${od.from_customer.phone || ''}</div>`;
    desc += `<div class=\"normal\">信息来源：${od.source || ''}</div>`;
    desc += `<div class=\"gray\">信息创建人：${op.name || ''}---${op.phone || ''}</div>`;
    desc += `<div class=\"gray\">已指派顾问：${od.dispatch_employer.name || ''}---${od.dispatch_employer.phone || ''}</div>`;
    return desc;
}

function mergeOptions(options, defaults) {
    for (var key in defaults) {
        options[key] = options[key] || defaults[key];
    }
    return options;
}

function getArray0(defaults) {
    let newObject = {};
    for (var key in defaults) {
        newObject[key] = defaults[key][0];
    }
    return newObject;
}