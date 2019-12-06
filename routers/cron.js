const express = require('express');
const routerCron = express.Router();

routerCron.get('/',
    (req, res, next) => {
        const col = req.data.db.collection('referreds');
        // find the order no dispatch employer
        col.find({ "order.dispatch_employer.id": 0 }).toArray().then(doc => {
            if (!Array.isArray(doc)) return 0;
            doc.forEach(item => {
                const msg = item.sendMsgs;
                console.log("sendMsgs: ", msg);
            });
            res.json({ msg: "ok!" });
        }).catch(console.log);
    }
)

module.exports = routerCron;