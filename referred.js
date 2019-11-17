const axios = require('axios');
const assert = require('assert');
const config = require('./config.json');
const sentMsg = require('./sent-msg');

module.exports = {
    new() {
        return (req, res, next) => {
            // create new referred data
            req.data.referred = {
                // 识别ID， 随机字符串
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
            // define textcard for dispatcher
            const textcard = {
                "title": "有新转介绍信息",
                "description": `<div class=\"gray\">${(new Date()).toLocaleDateString()}</div><div class=\"highlight\">被介绍客户：${req.query.customerName}---${req.query.customerPhone}</div><div class=\"normal\">信息创建人：${req.query.operator.name}---${req.query.operator.mobile}</div>`,
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
            // get referred from referredid
            const col = req.data.db.collection('referreds');
            // write action "dispatch" to object of referred
            col.findOne({ id: req.query.referredid })
                .next()
                .then(r => {
                    const taskid = randomString();
                    const taskcard = {
                        "title": "收到指派的转介绍任务",
                        "description": `<div class=\"gray\">${(new Date()).toLocaleDateString()}</div><div class=\"normal\">被介绍客户：${r.order.potential_customer.name}---${r.order.potential_customer.phone}</div><div class=\"highlight\">指派人：${req.query.operator.name}---${req.query.operator.mobile}</div>`,
                        "url": `http://www.all2key.cn/show-task.html?referredid=${req.query.referredid}&taskid=${taskid}`,
                        "task_id": taskid,
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
                .then(r => {
                    return col.updateOne();
                })
                .then(r => next())
                .catch(err => console.log(err));
        };
    },
    accept() {
        return (req, res, next) => {

        };
    },
    commit() {
        return (req, res, next) => {

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