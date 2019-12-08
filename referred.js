const axios = require('axios');
const assert = require('assert');
const config = require('./config.json');
const sentMsg = require('./sent-msg');
const { log, isDispatched, pushMsg, createId, act } = require('./common');
const sendQuery = require('./send_msg_to_users');

const referred = {};
// return users array
referred.getAdmins = function (users) {
    return typeof users == 'string' ? users.split('|') : users;
}

referred.midlleware = {
    new() {
        return async (req, res, next) => {
            /** req.query: { 
             * customerName: 客户姓名, 
             * customerPhone: 客户电话, 
             * carType: 意向车型, 
             * fromName: 介绍人姓名, 
             * fromPhone: 介绍人电话, 
             * preEmployerName: 建议指派顾问姓名, 
             * operator: { id, name, mobile} 创建人信息 }
             */
            req.query.operator = JSON.parse(req.query.operator);
            const rq = req.query;
            const referred = {
                // 订单识别ID， 16个字符随机字符串
                id: createId('', ''),//randomString(16),
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

            const textcard = {
                "title": "有新转介绍信息",
                "description": createDesc1(referred),
                "url": `http://www.all2key.cn/dispatch.html?referredid=${referred.id}`,
                "btntxt": "指派顾问"
            };

            const taskcard = {
                "title": "有新转介绍信息",
                "description": createDesc1(referred),
                "url": `http://www.all2key.cn/dispatch.html?referredid=${referred.id}`,
                //"task_id": createId(),
                "btn": [
                    {
                        "key": "new",
                        "name": "指派建议顾问",
                        "replace_name": "已指派顾问",
                        "color": "red",
                        "is_bold": true
                    },
                    {
                        "key": "delete",
                        "name": "删除此信息",
                        "replace_name": "信息已删除"
                    }
                ]
            };

            const col = req.data.db.collection('referreds');
            const _pushMsg = pushMsg(col, referred.id);
            //const _isDispatched = isDispatched(col, referred.id);

            //write referred to db
            await col.replaceOne({ "order.potential_customer.phone": referred.order.potential_customer.phone }, referred, { upsert: 1 });
            //间隔60秒检查是否指派，未指派则发送消息给下一位管理员。问题：灵活度不够，例如多次循环发送，每天检查发送等。
            //sendQuery(['YuChunJian', 'YuChunJian'], taskcard, _isDispatched, _pushMsg).exec(60);
            //单次发送
            await sentMsg.init({ touser: "YuChunJian" }).sentTaskcard(taskcard).then(_pushMsg);

            //req.data.referred = referred;
            res.json({ err: 0, msg: "新信息创建成功！" });
        };
    },
    dispatch() {
        return async (req, res, next) => {
            // req.query: { employer, operator, referredid, source }
            if (!req.query.employer || !req.query.referredid) {
                next();
            }
            else {
                const col = req.data.db.collection('referreds');
                // get admin info from adminId
                // write action "dispatch" to object of referred
                await col.updateOne(
                    { id: req.query.referredid },
                    {
                        $addToSet: {
                            tracks: { action: "dispatch", update_time: new Date(), operator: { id: config.referred.adminId }, data: req.query }
                        },
                        $set: {
                            "order.dispatch_employer": req.query.employer, "state": "dispatched", "order.source_type": req.query.source
                        }
                    },
                    { upsert: false }
                );
                // get referred from referredid
                const referred = await col.findOne({ id: req.query.referredid });
                const taskcard = {
                    "title": "收到指派的转介绍任务",
                    "description": createDesc2(referred),
                    "url": `http://www.all2key.cn/show-task.html?referredid=${referred.id}&employerid=${referred.order.dispatch_employer.id}`,
                    //"task_id": req.query.referredid,
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
                await sentMsg.init({ touser: referred.order.dispatch_employer.id }).sentTaskcard(taskcard).then(pushMsg(col, referred.id));
                // 更新任务卡片消息状态
                referred.sendMsgs.forEach(msg => {
                    if (msg.title == '有新转介绍信息')
                        axios.post(
                            `https://qyapi.weixin.qq.com/cgi-bin/message/update_taskcard?access_token=${global.token.access_token}`,
                            {
                                "userids": msg.touser,
                                "agentid": config.referred.agentid,
                                "task_id": msg.task_id,
                                "clicked_key": "new"
                            }
                        );
                });
                if (!req.query.nores) res.json({ err: 0, msg: "顾问指派成功！" });
                next();
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
                console.log("handle accept!");
                col.updateOne(
                    { id: post.TaskId },
                    { $addToSet: { tracks: { action: "accept", update_time: new Date(), operator: { id: post.FromUserName }, data: post } }, $set: { "state": "accepted" } },
                    { upsert: false })
                    //.then(r => res.send('success'))
                    .catch(err => console.log(err))
            } else {
                next();
            }
        };
    },
    dispatchPre() {
        return (req, res, next) => {
            const post = req.data.post;
            if (post.EventKey == 'new' && post.Event == 'taskcard_click') {
                // get user list
                axios.get(`https://qyapi.weixin.qq.com/cgi-bin/user/simplelist?access_token=${global.token.access_token}&department_id=22&fetch_child=0`)
                    // r.data: { "errcode": 0, "errmsg": "ok", "userlist": [{"userid": "zhangsan", "name": "李四", "department": [1, 2]}]}
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
                    .then(r => {
                        // set req.query to dispatch middleware
                        req.query = {
                            employer: { id: r.userid, name: r.name, department: r.department },
                            operator: { id: post.FromUserName },
                            referredid: post.TaskId.substr(3),
                            source: "转介绍",
                            nores: true
                        };
                        next();
                    })
                    .catch(err => console.log(err));
                // dispatch
            } else {
                next();
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
                    // send msg to admin and creater
                    const admin = r.tracks.find(t => t.action == 'dispatch').data.operator.id;
                    return sentMsg.init({ touser: admin }).addToUser('YuChunJian').sendMarkdown(content);
                })
                .then(r => next())
                .catch(err => console.log(err))
        };
    }
}

module.exports = referred;

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