const { TaskQuery } = require('./common');
const sentMsg = require('./sent-msg');
const assert = require('assert');

module.exports = function (users = [], taskcard, check, pushMsg) {
    const taskQuery = new TaskQuery();
    users = typeof users == 'string' ? users.split('|') : users;
    users.forEach(user => {
        taskQuery.use((ctx, next) => {
            // check dispatched?
            check().then(r => {
                // send massage to user
                if (r.name) return sentMsg
                    .init({ touser: user })
                    .sentTaskcard(taskcard)
                    .then(pushMsg)
                    .then(next)
                    .catch(console.log);
                else return 0;
            });
        });
    });
    return taskQuery;
};