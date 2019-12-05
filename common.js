const act = new Map([
    ["new", " 新建信息"],
    ["dispatch", "指派顾问"],
    ["accept", "接受指派"],
    ["proceed", "洽谈中"],
    ["success", "已成交"],
    ["ordered", "已订车"],
    ["fail", "战败"]
]);

function getParamValue(url, key) {
    const regex = new RegExp(key + "=([^&]*)", "i");
    const ret = url.match(regex);
    if (ret != null) return (ret[1]);
    return null;
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

function randomString(length = 8) {
    const chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let result = '';
    for (var i = length; i > 0; --i) result += chars[Math.floor(Math.random() * chars.length)];
    return result;
}

function log(text) {
    return r => {
        console.log(text, r);
        return Promise.resolve(r);
    };
}

function isDispatched(col, rfid) {
    return function () {
        // return promise
        if (!col || !rfid) return Promise.catch("isDispatched() error!");
        return col.findOne({ id: rfid })
            .then(r => r.order.dispatch_employer)
            .catch(err => console.log(err));
    }
}

function pushMsg(col, rfid) {
    return function (msg) {
        return col.updateOne(
            { id: rfid },
            { $addToSet: { sendMsgs: { msgtype: msg.msgtype, touser: msg.touser, task_id: msg.taskcard.task_id } } },
            { upsert: false })
            .catch(console.log);
    };
}

function createId(pefix = ''){
    return pefix + randomString(3) + new Date().getTime();
}

class TaskQuery {
    constructor() {
        this.tasks = [];
        this.ctx = {};
    }

    _delay(s) {
        return new Promise(function (resolve, reject) {
            setTimeout(() => {
                resolve();
            }, s * 1000);
        });
    }

    /**
     * add method to query
     * @param {function} fn
     */
    use(fn) {
        this.tasks.push(fn);
        return this;
    }

    /**
     * delay seconds
     * @param {int} s 
     */
    exec(s = 0) {
        const next = async () => {
            if (this.tasks.length === 0) return;
            const task = this.tasks.shift();
            if (s) await this._delay(s);
            task(this.ctx, next);
        }
        next();
    }

    exec2(s = 0) {
        const that = this;
        function next() {
            if (that.tasks.length === 0) return;
            const task = that.tasks.shift();
            if (s) that._delay(s).then(() => task(that.ctx, next));
            else task(that.ctx, next);
        }
        next();
    }
}

module.exports = { act, TaskQuery, log, randomString, mergeOptions, getArray0, getParamValue, isDispatched, pushMsg, createId };