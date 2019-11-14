const axios = require('axios');
const assert = require('assert');
const config = require('./config.json');

// 数据结构
const data = {
    // 识别ID
    id: 0,
    // 订单基础信息，通常不需要更改
    order: {
        potential_customer: { id: 1, name: "关羽", phone: "13768667656" },
        dispatch_employer: { id: 5, name: "赵云", phone: "12565678767" },
        from_customer: { id: 6, name: "刘备", phone: "12565767876" },
        carType: "宝来",
        source_type: "转介绍"
    },
    // 订单当前状态
    state: "new",
    // 订单跟踪记录
    tracks: [
        {
            action: "new",
            update_time: new Date(),
            operator: { id: 12, name: "张飞", phone: "13812567656" },
            data: {}
        },
        {
            action: "dispatch",
            update_time: new Date(),
            operator: {},
            data: { employer: {} }
        },
        {
            action: "accept",
            update_time: new Date(),
            operator: {},
            data: { employer: {} }
        },
        {
            action: "commit",
            update_time: new Date(),
            operator: {},
            data: { employer: {} }
        },
        {
            action: "end",
            update_time: new Date(),
            operator: {},
            data: { employer: {} }
        }
    ]
};

module.exports = {
    new() {
        return (req, res, next) => {
            req.data.referred = {
                // 识别ID
                id: new Date().getTime(),
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
            const textCard = {
                "touser": "YuChunJian",
                //"toparty" : "PartyID1 | PartyID2",
                //"totag" : "TagID1 | TagID2",
                "msgtype": "textcard",
                "agentid": config.referred.agentid,
                "textcard": {
                    "title": "收到新转介绍信息通知",
                    "description": `<div class=\"gray\">${(new Date()).toLocaleDateString()}</div><div class=\"normal\">被介绍客户：${req.query.customerName}---${req.query.customerPhone}</div><div class=\"highlight\">信息创建人：${req.query.operator.name}---${req.query.operator.mobile}</div>`,
                    "url": `http://www.all2key.cn/dispatch.html?referredid=${req.data.referred.id}`,
                    "btntxt": "指派顾问"
                },
                "enable_id_trans": 0
            };

            req.data.db.collection('referreds')
                .replaceOne({ "order.potential_customer.phone": req.data.referred.order.potential_customer.phone }, req.data.referred, { upsert: 1 })
                .then(r => axios.post(`https://qyapi.weixin.qq.com/cgi-bin/message/send?access_token=${global.token.access_token}`, textCard))
                .then(r => console.log("axios.post(): ", r.data))
                .then(r => next())
                .catch(err => console.log(err));
        };
    },
    dispatch() {
        return (req, res, next) => {

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

//-------------------------------------------------------------------------
class Referred {
    constructor(data = {}) {
        this.data = data;
        // 异步操作 async
        this.actions = {
            new: () => {

            }
        };
        // 同步操作 sync
        this.mutations = [
            {
                accept: () => {
                    this.data.tracks.push({
                        action: "accept",
                        update_time: new Date(),
                        operator: { id: 11, name: "马超", phone: "111" },
                        data: this.data
                    });
                    this.state = "accept";
                }
            }
        ]

    }

    dispatch() {

    }

    commit(mutation) {

    }

    show() {
        console.log(JSON.stringify(this.data, null, 4));
    }

    get() {

    }
}