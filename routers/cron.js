const express = require('express');
const routerCron = express.Router();
const { createId, isDispatched, log } = require('../common');
const { referred, _rf } = require('../referred');
const sentMsg = require('../sent-msg');

routerCron.use('/',
    async (req, res, next) => {
        const col = req.data.db.collection('referreds');
        // find the order no dispatch employer
        //[debug]const rfs = await col.find({ "order.from_customer.phone": "18669077710" }).toArray();
        const rfs = await col.find({}).toArray();
        if (!Array.isArray(rfs)) return 0;
        req.data.rfs = rfs;
        next();
    }
);

routerCron.get('/everyday', async function (req, res, next) {
    const rfs = req.data.rfs;
    const col = req.data.db.collection('referreds');
    rfs.forEach(rf => {
        if(new Date().getDate() == rf.tracks.pop().update_time.getDate())return 0;
        const pushMsg = referred.pushMsg(col, rf.id);
        switch (rf.state) {
            case 'dispatched':
                // send text to employer
                console.log("cron send message of dispatched");
                sentMsg.init({ touser: rf.order.dispatch_employer.id }).sentText({ "content": "温馨提醒：您有转介绍订单任务需要处理。请点击相应任务卡片按钮开始处理！" }).then(pushMsg).catch(err => console.log(err));
                break;
            case 'accepted' || 'proceed':
                // send text to employer
                console.log("cron send message of accepted");
                sentMsg.init({ touser: rf.order.dispatch_employer.id }).sentText({ "content": "温馨提醒：您还有需继续跟进的转介绍订单。请点击相应任务卡片及时汇报跟进情况！" }).then(pushMsg).catch(err => console.log(err));
                break;
            default:
                break;
        }
    });
    res.json({ msg: "everyday ok!" });
})

routerCron.get('/minute5', async function (req, res, next) {
    const col = req.data.db.collection('referreds');
    const rfs = req.data.rfs;
    rfs.forEach(rf => {
        //if(!rf.sendMsgs)return 0;
        //console.log("sendMsgs", rf.sendMsgs);
        const msg = Array.isArray(rf.sendMsgs) ? rf.sendMsgs.pop() : null;
        const pushMsg = referred.pushMsg(col, rf.id);
        switch (rf.state) {
            case 'new':
                if (!msg || new Date() - msg.update_time > 6 * 60 * 1000) {
                    const users = referred.getAdmins(global.config.referred.adminId);
                    const user = msg.data.touser;
                    const i = users.lastIndexOf(user);
                    //const i = users.indexOf(user);
                    console.log("enter cron/case/new");
                    if (i < users.length - 1) {
                        console.log("cron send message of new!");
                        sentMsg.init(msg.data).init({ touser: users[i + 1] }).sentTaskcard().then(pushMsg).catch(console.log);
                    }
                }
                break;
            default:
                break;
        }
    });
    res.json({ msg: "minute5 ok!" });
});

module.exports = routerCron;