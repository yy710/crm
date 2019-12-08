const express = require('express');
const routerCron = express.Router();
const { createId, isDispatched } = require('../common');
const referred = require('../referred');

routerCron.get('/',
    async (req, res, next) => {
        res.json({ msg: "ok!" });
        const col = req.data.db.collection('referreds');
        // find the order no dispatch employer
        const referreds = await col.find({}).toArray();
        if (!Array.isArray(referreds)) return 0;

        referreds.forEach(rf => {
            switch (rf.state) {
                case 'new':
                new Date() - rf.sendMsgs[-1].time < 5*60*1000
                    const users = referred.getAdmins(global.config.referred.adminId);
                    const user = rf.sendMsgs.pop().touser;
                    const i = users.lastIndexOf(user);
                    sendMsg({ touser: users[i + 1] });
                    break;
                case 'dispatched':
                    break;
                default:
                    break;
            }
        });
    }
)

module.exports = routerCron;