const { TaskQuery } = require('./common');
const sentMsg = require('./sent-msg');

module.exports = function (users = [], taskcard) {
    const taskQuery = new TaskQuery();
    users = typeof users == 'string' ? users.split('|') : users;
    users.forEach(user => {
        taskQuery.use((ctx, next) => {
            // send massage to user
            sentMsg
                .init({ touser: user })
                .sentTaskcard(taskcard)
                .then(r => next())
                .catch(err => console.log(err));
        });
    });
    return taskQuery;
};