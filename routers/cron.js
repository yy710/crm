const express = require('express');
const routerCron = express.Router();
const { createId, isDispatched } = require('../common');
const { referred } = require('../referred');
const sentMsg = require('../sent-msg');

routerCron.get('/',
    async (req, res, next) => {
        res.json({ msg: "ok!" });
        const col = req.data.db.collection('referreds');
        // find the order no dispatch employer
        const rfs = await col.find({}).toArray();
        if (!Array.isArray(rfs)) return 0;

        rfs.forEach(rf => {
            //if(!rf.sendMsgs)return 0;
            //console.log("sendMsgs", rf.sendMsgs);
            const msg = rf.sendMsgs.pop();
            const pushMsg = referred.pushMsg(col, rf.id);
            switch (rf.state) {
                case 'new':
                    if (new Date() - msg.update_time > 1 * 60 * 1000) {
                        const users = referred.getAdmins(global.config.referred.adminId);
                        const user = msg.data.touser;
                        const i = users.lastIndexOf(user);
                        console.log("dsgsgsgsgsgs");
                        if (i < users.length - 1) {
                            console.log("sendsend!");
                            sendMsg.init(msg.data).init({ touser: users[i + 1] }).sendTaskCard().then(pushMsg).catch(console.log);
                        }
                    }
                    break;
            /*     case 'dispatched':
                    // send text to employer
                    const text = { "content": "温馨提醒：您有转介绍订单任务需要处理。\n请点击相应任务卡片按钮开始处理！" };
                    sendMsg.init({ touser: rf.order.dispatch_employer.id }).sendText(text).then(pushMsg);
                    break;
                case 'accepted' || 'proceed':
                    // send text to employer
                    const text = { "content": "温馨提醒：您还有需继续跟进的转介绍订单。\n请点击相应任务卡片及时汇报跟进情况！" };
                    sendMsg.init({ touser: rf.order.dispatch_employer.id }).sendText(text).then(pushMsg);
                    break; */
                default:
                    break;
            }
        });
    }
)

module.exports = routerCron;