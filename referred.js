const axios = require('axios');
const assert = require('assert');
const config = require('./config.json');
const SentMsg = require('./sent-msg');
const { log, randomString, act } = require('./common');
const sendQuery = require('./send_msg_to_users');

class Referred {

}

const _rf = {
    async init(col, rfid) {
        try {
            this.col = col;
            this.rfid = rfid;
            this.rf = await this._getRf();
            return this;
        } catch (error) {
            console.log("sync _rf.init(): ", error);
        }
    },
    // return users array
    getAdmins(users) {
        return typeof users == 'string' ? users.split('|') : users;
    },

    pushMsg(msg, cb = null) {
        return this.col.updateOne(
            { id: this.rfid },
            { $push: { sendMsgs: { update_time: new Date(), data: typeof cb == "function" ? cb(msg) : msg } } },
            { upsert: false })
            .catch(console.log);
    },

    getEmployer() {
        return this.order.dispatch_employer;
    },

    getDispatch() {
        return this.tracks.find(t => t.action == 'dispatch').operator;
    },

    _getRf() {
        // return promise
        return this.col.findOne({ id: this.rfid }).catch(err => console.log(err));
    },

    getRf() {
        return this.rf;
    }
};

const referred = {
    init(col, rfid) {
        this.col = col;
        this.rfid = rfid;
    },
    // return users array
    getAdmins(users) {
        return typeof users == 'string' ? users.split('|') : users;
    },

    pushMsg(col, rfid) {
        return function (msg, cb = null) {
            return col.updateOne(
                { id: rfid },
                { $push: { sendMsgs: { update_time: new Date(), data: typeof cb == "function" ? cb(msg) : msg } } },
                { upsert: false })
                .catch(console.log);
        };
    },

    getEmployer(col, rfid) {
        return function () {
            // return promise
            return col.findOne({ id: rfid })
                .then(r => r.order.dispatch_employer)
                .catch(err => console.log(err));
        }
    },

    getDispatch(col, rfid) {
        return function () {
            // return promise
            return col.findOne({ id: rfid })
                .then(r => r.tracks.find(t => t.action == 'dispatch').operator)
                .catch(err => console.log(err));
        }
    },

    getRf(col, rfid) {
        return function () {
            // return promise
            return col.findOne({ id: rfid }).catch(err => console.log(err));
        }
    },

    req2referred(rq) {
        /** rq: { 
        * customerName: 客户姓名, 
        * customerPhone: 客户电话, 
        * carType: 意向车型, 
        * fromName: 介绍人姓名, 
        * fromPhone: 介绍人电话, 
        * preEmployerName: 建议指派顾问姓名, 
        * operator: { id, name, mobile} 创建人信息 }
        */
        return {
            // 订单识别ID
            id: new Date().getTime().toString(),
            // 订单基础信息，通常不需要更改
            order: {
                potential_customer: { id: 0, name: rq.customerName, phone: rq.customerPhone },
                dispatch_employer: { id: 0, name: '', phone: '' },
                from_customer: { id: 0, name: rq.fromName, phone: rq.fromPhone },
                creater: rq.operator,
                carType: rq.carType,
                source_type: '转介绍'
            },
            // 订单当前状态
            state: "new",
            // 发送消息记录
            sendMsgs: [],
            // 订单跟踪记录
            tracks: [{
                action: "new",
                update_time: new Date(),
                operator: rq.operator,
                data: rq
            }]
        };
    },

    rf2taskcardOfNew(rf) {
        return {
            "title": "有新转介绍信息",
            "description": createDesc(rf),
            "url": `http://www.all2key.cn/to-dispatch.html?referredid=${rf.id}`,
            "task_id": randomString(8) + rf.id,
            "btn": [{
                "key": "new",
                "name": "指派建议顾问",
                "replace_name": "已指派顾问",
                "color": "red",
                "is_bold": true
            }]
        };
    },

    sentTaskOfNew(rf) {

    }
};


const mw = {
    new() {
        return async (req, res, next) => {
            try {
                req.query.operator = JSON.parse(req.query.operator);
                const rf = referred.req2referred(req.query);
                const taskcard = referred.rf2taskcardOfNew(rf);

                const col = req.data.db.collection('referreds');
                //const pushMsg = referred.pushMsg(col, rf.id);
                //const _isDispatched = isDispatched(col, referred.id);
                const sentMsg = new SentMsg(col, rf.id)

                //write referred to db
                await col.replaceOne({ "order.potential_customer.phone": rf.order.potential_customer.phone }, rf, { upsert: 1 });
                //间隔60秒检查是否指派，未指派则发送消息给下一位管理员。问题：灵活度不够，例如多次循环发送，每天检查发送等。
                //sendQuery(['YuChunJian', 'YuChunJian'], taskcard, _isDispatched, _pushMsg).exec(60);
                //单次发送
                await sentMsg.init({ touser: "YuChunJian" }).sentTaskcard(taskcard);

                //req.data.referred = referred;
                res.json({ err: 0, msg: "新信息创建成功！" });
            } catch (error) {
                console.log("async new: ", error);
            }
        };
    },
    dispatch() {
        return async (req, res, next) => {
            try {
                const col = req.data.db.collection('referreds');
                // req.query: { employer, operator, referredid, source }
                if (!req.query.employer || !req.query.referredid) {
                    next();
                }
                else {
                    //const pushMsg = referred.pushMsg(col, req.query.referredid);
                    // get admin info from adminId
                    // write action "dispatch" to object of referred
                    await col.updateOne(
                        { id: req.query.referredid },
                        {
                            $push: {
                                tracks: { action: "dispatch", update_time: new Date(), operator: req.query.operator, data: req.query }
                            },
                            $set: {
                                "order.dispatch_employer": req.query.employer, "state": "dispatched", "order.source_type": req.query.source
                            }
                        },
                        { upsert: false }
                    );
                    // get referred from referredid
                    const rf = await col.findOne({ id: req.query.referredid });
                    const taskcard = {
                        "title": "收到指派的转介绍任务",
                        "description": createDesc(rf),
                        "url": `http://www.all2key.cn/show-task.html?referredid=${rf.id}&employerid=${rf.order.dispatch_employer.id}`,
                        "task_id": randomString(8) + rf.id,
                        "btn": [{
                            "key": "accept",
                            "name": "接受任务",
                            "replace_name": "已接受任务",
                            "color": "red",
                            "is_bold": true
                        }]
                    };
                    await (new SentMsg(col, rf.id)).init({ touser: rf.order.dispatch_employer.id }).sentTaskcard(taskcard);
                    // send message to creater
                    await (new SentMsg(col, rf.id)).init({ touser: rf.order.creater.id }).sentText({ "content": `您创建的转介绍订单已指派给顾问${rf.order.dispatch_employer.name}跟进处理！` });
                    // 更新任务卡片消息状态
                    updateTaskcardMsgs(rf, '有新转介绍信息');
                    if (!req.query.nores) res.json({ err: 0, msg: "顾问指派成功！" });
                    next();
                }
            } catch (error) {
                console.log("sync dispatch: ", error);
            }
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

            if (post.EventKey == 'accept' && post.Event == 'taskcard_click') {
                const col = req.data.db.collection('referreds');
                const rfid = post.TaskId.substr(8);
                //const pushMsg = referred.pushMsg(col, rfid);
                const sentMsg = new SentMsg(col, rfid);
                console.log("handle accept!");
                col.updateOne(
                    { id: rfid },
                    { $push: { tracks: { action: "accept", update_time: new Date(), operator: { id: post.FromUserName }, data: post } }, $set: { "state": "accepted" } },
                    { upsert: false })
                    .then(referred.getRf(col, rfid))
                    .then(rf => {
                        // 更新任务卡片消息状态
                        //updateTaskcardMsgs(rf, '收到指派的转介绍任务');
                        return rf;
                    })
                    .then(r => sentMsg.init({ touser: r.tracks.find(t => t.action == 'dispatch').operator.id }).sentText({ content: `销售顾问${r.order.dispatch_employer.name}已接受指派任务！` }))
                    .catch(err => console.log(err))
            } else {
                next();
            }
        };
    },
    dispatchPre() {
        return async (req, res, next) => {
            try {
                const post = req.data.post;
                if (post.EventKey == 'new' && post.Event == 'taskcard_click') {
                    const rfid = post.TaskId.substr(8);
                    //console.log("rfid: ", rfid);
                    // get sales list
                    const userlist = (await axios.get(`https://qyapi.weixin.qq.com/cgi-bin/user/simplelist?access_token=${global.token.access_token}&department_id=22&fetch_child=0`)).data.userlist;
                    // r.data: { "errcode": 0, "errmsg": "ok", "userlist": [{"userid": "zhangsan", "name": "李四", "department": [1, 2]}]}
                    const col = req.data.db.collection('referreds');
                    // find user in corp
                    const referred = await _rf.init(col, rfid)
                    const rf = referred.getRf();
                    //console.log("pre", rf);
                    const user = userlist.find(user => {
                        return user.name == rf.tracks[0].data.preEmployerName;
                    });
                    console.log("userlist.find(): ", user);
                    if (user) {
                        // set req.query to dispatch middleware
                        req.query = {
                            employer: { id: user.userid, name: user.name, department: user.department },
                            operator: { id: post.FromUserName },
                            referredid: rfid,
                            source: "转介绍",
                            nores: true
                        };
                        next();
                    } else {
                        //send message to operator
                        //console.log("pre dispatch not find!");
                        (new SentMsg(col, rfid)).init({ touser: post.FromUserName }).sentText({ content: "自动指派顾问失败！可能顾问名字不正确，请点击任务卡手动指派。" }).catch(console.log)
                    }
                } else {
                    next();
                }
            } catch (error) {
                console.log("sync dispatchPre: ", error);
            }
        };
    },
    commit() {
        return async (req, res, next) => {
            try {
                /**
             * req.query
             *  { message: '好',
             * state: '1',
             * empolyerid: 'YuChunJian',
             * referredid: 'tJpO4tfReysQy7JU' }
             */
                const col = req.data.db.collection('referreds');
                //const pushMsg = referred.pushMsg(col, req.query.referredid);
                const sentMsg = new SentMsg(col, req.query.referredid);
                await col.updateOne(
                    { id: req.query.referredid },
                    { $push: { tracks: { action: req.query.state, update_time: new Date(), operator: { id: req.query.employerid }, data: req.query } }, $set: { "state": req.query.state } },
                    { upsert: false });
                // get referred
                const rf = await col.findOne({ id: req.query.referredid });
                const content = `转介绍订单状态变化通知
                >**订单详情** 
                ><font color="info">客  户：${rf.order.potential_customer.name}---${rf.order.potential_customer.phone}</font>
                >来源类型：${rf.order.source_type} 
                >介绍人：${rf.order.from_customer.name}---${rf.order.from_customer.phone} 
                >指派顾问：${rf.order.dispatch_employer.name}
                >创建人：${rf.tracks[0].operator.name}
                >创建时间：${rf.tracks[0].update_time.toLocaleString()}
                ><font color="warning">现在状态：${act.get(rf.state)}</font>
                ><font color="comment">状态更新说明：${req.query.message || ''}</font>
                >[点击查看订单历史](http://www.all2key.cn/history.html?referredid=${rf.id})`;
                // send msg to admin and creater
                const admin = rf.tracks.find(t => t.action == 'dispatch').operator.id;
                await sentMsg.init({ touser: admin }).addToUser('YuChunJian').addToUser(rf.order.creater.id).sendMarkdown(content);
                next();
            } catch (error) {
                console.log("sync commit: ", error);
            }
        };
    }
}

module.exports = { _rf, referred, mw };

// define textcard for dispatcher
function createDesc(ref) {
    const od = ref.order;
    const op = ref.tracks[0].operator;
    let desc = `<div class=\"gray\">${(new Date()).toLocaleString()}</div>`;
    desc += `<div class=\"highlight\">被介绍客户：${od.potential_customer.name || ''}---${od.potential_customer.phone || ''}</div>`;
    desc += `<div class=\"highlight\">意向车型：${od.carType || ''}</div>`;
    desc += `<div class=\"normal\">介绍人：${od.from_customer.name || ''}---${od.from_customer.phone || ''}</div>`;
    desc += `<div class=\"gray\">信息创建人：${op.name || ''}---${op.mobile || ''}</div>`;
    desc += ref.tracks[0].data.preEmployerName ? `<div class=\"gray\">建议指派顾问：${ref.tracks[0].data.preEmployerName}</div>` : '';
    desc += od.dispatch_employer.name ? `<div class=\"gray\">已指派顾问：${od.dispatch_employer.name}</div>` : '';
    return desc;
}

function updateTaskcardMsgs(rf, title) {
    if (!Array.isArray(rf.sendMsgs) || rf.sendMsgs.length == 0) return 0;
    rf.sendMsgs.forEach(msg => {
        if (msg.data.taskcard && msg.data.taskcard.title == title) {
            const taskcard = msg.data.taskcard;
            axios.post(
                `https://qyapi.weixin.qq.com/cgi-bin/message/update_taskcard?access_token=${global.token.access_token}`,
                {
                    "userids": msg.data.touser,
                    "agentid": msg.data.agentid,
                    "task_id": taskcard.task_id,
                    "clicked_key": taskcard.btn[0].key
                }
            );
        }
    });
}