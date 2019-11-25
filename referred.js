const axios = require('axios');
const assert = require('assert');
const config = require('./config.json');
const sentMsg = require('./sent-msg');

const act = new Map([
    ["new", " 新建信息"],
    ["dispatched", "指派顾问"],
    ["accepted", "接受指派"],
    ["proceed", "洽谈中"],
    ["success", "已成交"],
    ["ordered", "已订车"],
    ["fail", "战败"]
]);

module.exports = {
    findDup() {
        return (req, res, next) => {
            next();
        };
    },
    new() {
        return (req, res, next) => {
            // create new referred data
            /**
             * req.query
             *      customerName: 客户姓名,
                    customerPhone: 客户电话,
                    carType: 意向车型,
                    fromName: 介绍人姓名,
                    fromPhone: 介绍人电话,
                    preEmployerName: 建议指派顾问姓名,
                    operator: { id, name, mobile} 创建人信息
             */
            req.data.referred = {
                // 识别ID， 16个字符随机字符串
                id: randomString(16),
                // 订单基础信息，通常不需要更改
                order: {
                    potential_customer: { id: 0, name: req.query.customerName, phone: req.query.customerPhone },
                    dispatch_employer: { id: 0, name: '', phone: '' },
                    from_customer: { id: 0, name: req.query.fromName, phone: req.query.fromPhone },
                    carType: req.query.carType,
                    source_type: ''
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
                "description": createDesc1(req.data.referred),
                "url": `http://www.all2key.cn/dispatch.html?referredid=${req.data.referred.id}`,
                "btntxt": "指派顾问"
            };
            const taskcard = {
                "title": "有新转介绍信息",
                "description": createDesc1(req.data.referred),
                "url": `http://www.all2key.cn/dispatch.html?referredid=${req.data.referred.id}`,
                "task_id": 'new' + req.data.referred.id,
                "btn": [
                    {
                        "key": "new",
                        "name": "直接指派建议顾问",
                        "replace_name": "已指派顾问",
                        "color": "red",
                        "is_bold": true
                    }
                ]
            };
            // write new referred to db and send textcard to dispatcher
            req.data.db.collection('referreds')
                .replaceOne({ "order.potential_customer.phone": req.data.referred.order.potential_customer.phone }, req.data.referred, { upsert: 1 })
                //.then(r => sentMsg.init().sentTextcard(textcard))
                .then(r => sentMsg.init({ touser: 'YuChunJian' }).sentTaskcard(taskcard))
                .then(log("sendTaskcard: "))
                .then(r => next())
                .catch(err => console.log(err));
        };
    },
    dispatch() {
        return (req, res, next) => {
            console.log("dispatch req.query", req.query);
            const col = req.data.db.collection('referreds');
            // get admin info from adminId
            // write action "dispatch" to object of referred
            col.updateOne(
                { id: req.query.referredid },
                { $addToSet: { tracks: { action: "dispatch", update_time: new Date(), operator: { id: config.referred.adminId }, data: req.query } }, $set: { "order.dispatch_employer": req.query.employer, "state": "dispatched", "order.source_type": req.query.source } },
                { upsert: false })
                // get referred from referredid
                .then(r => col.findOne({ id: req.query.referredid }))
                .then(r => {
                    //const taskid = randomString();
                    const taskcard = {
                        "title": "收到指派的转介绍任务",
                        "description": createDesc2(r),
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
                    return sentMsg.init({ touser: req.query.employer.id }).sentTaskcard(taskcard);
                })
                // 更新任务卡片消息状态
                .then(r => axios.post(`https://qyapi.weixin.qq.com/cgi-bin/message/update_taskcard?access_token=${global.token.access_token}`, {
                    "userids": ["YuChunJian"],
                    "agentid": config.referred.agentid,
                    "task_id": 'new' + req.query.referredid,
                    "clicked_key": "new"
                }))
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
                    .then(r => next())
                    .catch(err => console.log(err))
            }
        };
    },
    dispatchPre() {
        return (req, res, next) => {
            const post = req.data.post;
            if (post.EventKey != 'new' || post.Event != 'taskcard_click') next();
            else {
                // get user list
                axios.get(`https://qyapi.weixin.qq.com/cgi-bin/user/simplelist?access_token=${global.token.access_token}&department_id=22&fetch_child=0`)
                    /**
                     * r.data: {
                    "errcode": 0,
                    "errmsg": "ok",
                    "userlist": [
                      {
                      "userid": "zhangsan",
                      "name": "李四",
                      "department": [1, 2]
                       }
                     ]
                    }
                     */
                    .then(r => {
                        assert.equal(0, r.data.errcode);
                        const col = req.data.db.collection('referreds');
                        return col.findOne({ id: post.TaskId.substr(3) }).then(doc => {
                            // find user in corp
                            return r.data.userlist.find(element => {
                                return element.name == doc.tracks[0].data.preEmployerName;
                            });
                        });
                    })
                    .then(log("userlist.find(): "))
                    .then(r => next())
                    .catch(err => console.log(err));

                // dispatch
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
                // get referred
                .then(r => col.findOne({ id: req.query.referredid }))
                // send msg to admin
                .then(r => {
                    const content = `转介绍订单状态变化通知
                    >**订单详情** 
                    ><font color="info">客  户：${r.order.potential_customer.name}---${r.order.potential_customer.phone}</font>
                    >来源类型：${r.order.source_type} 
                    >介绍人：${r.order.from_customer.name}---${r.order.from_customer.phone} 
                    >指派顾问：${r.order.dispatch_employer.name}
                    >创建人：${r.tracks[0].operator.name}
                    >创建时间：${r.tracks[0].update_time.toLocaleString()}
                    ><font color="warning">现在状态：${act.get(r.state)}</font>
                    ><font color="comment">状态更新说明：${req.query.message}</font>
                    >[点击查看订单历史](http://www.all2key.cn/history.html?referredid=${r.id})`;

                    return sentMsg.init({ touser: "YuChunJian" }).sendMarkdown(content);
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
function createDesc1(ref) {
    const od = ref.order;
    const op = ref.tracks[0].operator;
    let desc = `<div class=\"gray\">${(new Date()).toLocaleString()}</div>`;
    desc += `<div class=\"highlight\">被介绍客户：${od.potential_customer.name || ''}---${od.potential_customer.phone || ''}</div>`;
    desc += `<div class=\"highlight\">意向车型：${od.carType || ''}</div>`;
    desc += `<div class=\"normal\">介绍人：${od.from_customer.name || ''}---${od.from_customer.phone || ''}</div>`;
    desc += `<div class=\"gray\">信息创建人：${op.name || ''}---${op.mobile || ''}</div>`;
    desc += `<div class=\"gray\">建议指派顾问：${ref.tracks[0].data.preEmployerName || ''}</div>`;
    return desc;
}

function createDesc2(ref) {
    const od = ref.order;
    const op = ref.tracks[0].operator;
    let desc = `<div class=\"gray\">${(new Date()).toLocaleString()}</div>`;
    desc += `<div class=\"highlight\">被介绍客户：${od.potential_customer.name || ''}---${od.potential_customer.phone || ''}</div>`;
    desc += `<div class=\"highlight\">意向车型：${od.carType || ''}</div>`;
    desc += `<div class=\"normal\">介绍人：${od.from_customer.name || ''}---${od.from_customer.phone || ''}</div>`;
    desc += `<div class=\"normal\">信息来源：${od.source_type || ''}</div>`;
    desc += `<div class=\"gray\">信息创建人：${op.name || ''}---${op.mobile || ''}</div>`;
    desc += `<div class=\"gray\">已指派顾问：${od.dispatch_employer.name || ''}</div>`;
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

function log(txt) {
    return r => {
        console.log(txt, r);
        return Promise.resolve(r);
    }
}