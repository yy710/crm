const express = require('express');
const routerCron = express.Router();
const { createId, isDispatched, log } = require('../common');
const { referred, _rf } = require('../referred');
const SentMsg = require('../sent-msg');

routerCron.get('/everyday', async function (req, res, next) {
  try {
    console.log('enter cron/everyday');
    const col = req.data.db.collection('referreds');
    const rfs = await col.find({ state: { $in: ['dispatched', 'accepted', 'proceed', 'ordered'] } }).toArray();

    rfs.forEach(rf => {
      if (new Date().getDate() == rf.tracks.pop().update_time.getDate()) return 0;
      const sendToEmployer = _sendToEmployer(col, rf);

      if (rf.state == 'dispatched') {
        // send text to employer
        console.log('cron send message of dispatched');
        sendToEmployer({ content: '温馨提醒：您有转介绍订单任务需要处理。请点击相应任务卡片按钮开始处理！' }).catch(err => console.log(err));
      } else if (rf.state == 'accepted' || rf.state == 'proceed') {
        // send text to employer
        console.log('cron send message of accepted');
        //sendToEmployer({ "content": "温馨提醒：您还有需继续跟进的转介绍订单。请点击相应任务卡片及时汇报跟进情况！" }).catch(err => console.log(err));
      } else if (rf.state == 'ordered') {
        console.log('cron send message of ordered');
        //sendToEmployer({ "content": "温馨提醒：您有已订车的转介绍订单，请及时提交最新进展！" }).catch(err => console.log(err));
      }
    });
    res.json({ msg: 'everyday ok!' });
  } catch (error) {
    console.log('/cron/everyday error:', error);
  }

  function _sendToEmployer(col, rf) {
    return function (content) {
      return new SentMsg(col, rf.id)
        .toUser(rf.order.dispatch_employer.id)
        .sentText(content)
        .catch(err => console.log(err));
    };
  }
});

routerCron.get('/minute5', async function (req, res, next) {
  try {
    console.log('enter cron/minute5');
    const col = req.data.db.collection('referreds');
    const rfs = await col.find({ state: 'new' }).toArray();

    rfs.forEach(rf => {
      if (rf.state != 'new') return 0;
      const sentMsg = new SentMsg(col, rf.id);
      //console.log("/minute5 rf: ", rf);
      const msg =
        Array.isArray(rf.sendMsgs) && rf.sendMsgs.length > 0
          ? rf.sendMsgs.filter(m => m.data.taskcard && m.data.taskcard.title == '有新转介绍信息').pop()
          : { update_time: new Date('2019-12-10'), data: { touser: 'YuChunJian', taskcard: referred.rf2taskcardOfNew(rf) } };

      if (new Date() - msg.update_time > 1 * 60 * 1000) {
        const users = referred.getAdmins(global.config.referred.adminId);
        const user = msg.data.touser;
        console.log('last user to send message: ', user);
        const i = users.lastIndexOf(user);
        //const i = users.indexOf(user);//[debug]
        if (i < users.length - 1) {
          console.log('cron/minute5 will send message to user: ', users[i + 1]);
          //console.log("msg.data.taskcard: ", msg.data.taskcard);
          sentMsg
            .init(msg.data)
            .toUser(users[i + 1])
            .sentTaskcard()
            .catch(err => console.log(err));
        }
      } else {
        console.log('1 minute not reach!');
      }
    });
    res.json({ msg: 'minute5 ok!' });
  } catch (error) {
    console.log('/cron/minute5 error:', error);
  }
});

module.exports = routerCron;
