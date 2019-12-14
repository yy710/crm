const express = require('express');
const routerCron = express.Router();
const { createId, isDispatched, log } = require('../common');
const { referred, _rf } = require('../referred');
const SentMsg = require('../sent-msg');

routerCron.use('/',
    async (req, res, next) => {
        try {
            const col = req.data.db.collection('referreds');
            // find the order no dispatch employer
            //const rfs = await col.find({ "order.potential_customer.phone": "18669077711" }).toArray();//[debug]
            const rfs = await col.find().toArray();
            if (!Array.isArray(rfs)) return 0;
            req.data.rfs = rfs;
            next();
        } catch (error) {
            console.log("/cron error:", error);
        }
    }
);

routerCron.get('/everyday', function (req, res, next) {
    const rfs = req.data.rfs;
    const col = req.data.db.collection('referreds');
    rfs.forEach(rf => {
        if (new Date().getDate() == rf.tracks.pop().update_time.getDate()) return 0;

        if (rf.state == 'dispatched') {
            // send text to employer
            console.log("cron send message of dispatched");
            (new SentMsg(col, rf.id)).init({ touser: rf.order.dispatch_employer.id }).sentText({ "content": "温馨提醒：您有转介绍订单任务需要处理。请点击相应任务卡片按钮开始处理！" }).catch(err => console.log(err));
        } else if (rf.state == 'accepted' || rf.state == 'proceed') {
            // send text to employer
            console.log("cron send message of accepted");
            (new SentMsg(col, rf.id)).toUser(rf.order.dispatch_employer.id).sentText({ "content": "温馨提醒：您还有需继续跟进的转介绍订单。请点击相应任务卡片及时汇报跟进情况！" }).catch(err => console.log(err));
        } else if (rf.state == 'ordered') {
            console.log("cron send message of ordered");
            (new SentMsg(col, rf.id)).toUser(rf.order.dispatch_employer.id).sentText({ "content": "温馨提醒：您有已订车的转介绍订单，请及时提交最新进展！" }).catch(err => console.log(err));
        }
    });
    res.json({ msg: "everyday ok!" });
})

routerCron.get('/minute5', function (req, res, next) {
    const col = req.data.db.collection('referreds');
    const rfs = req.data.rfs;
    rfs.forEach(rf => {
        if (rf.state != 'new') return 0;
        const sentMsg = new SentMsg(col, rf.id)
        const msg = Array.isArray(rf.sendMsgs) && rf.sendMsgs.length > 0 ? rf.sendMsgs.pop() : { update_time: new Date('2019-12-10'), data: { touser: 'YuChunJian', taskcard: referred.rf2taskcardOfNew(rf) } };

        if (new Date() - msg.update_time > 1 * 60 * 1000) {
            const users = referred.getAdmins(global.config.referred.adminId);
            const user = msg.data.touser;
            const i = users.lastIndexOf(user);
            //const i = users.indexOf(user);//[debug]
            console.log("enter cron/case/new");
            if (i < users.length - 1) {
                console.log("cron send message of new!");
                //console.log("msg.data.taskcard: ", msg.data.taskcard);
                sentMsg.init(msg.data).toUser(users[i + 1]).sentTaskcard().catch(err => console.log(err));
            }
        }
    });
    res.json({ msg: "minute5 ok!" });
});

module.exports = routerCron;