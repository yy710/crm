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

function sampleMsg(sendMsg) {
    return {
        title: sendMsg.title,
        msgtype: sendMsg.msgtype,
        touser: sendMsg.touser,
        task_id: sendMsg.taskcard.task_id
    };
}

function pushMsg(col, rfid) {
    return function (msg, cb = null) {
        return col.updateOne(
            { id: rfid },
            { $addToSet: { sendMsgs: typeof cb == "function" ? cb(msg) : msg } },
            { upsert: false })
            .catch(console.log);
    };
}

function createId(pefix = '', r = 8, d = true, suffix = '') {
    return pefix + randomString(r) + d ? new Date().getTime() : '' + suffix;
}

// my mini middleware, use exec() to start
class TaskQuery {
    constructor() {
        this.tasks = [];
        this.ctx = {};
    }

    /**
     * 
     * @param {number} s 
     */
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

    *yieldExec() {
        if (this.tasks.length === 0) return;
        const task = this.tasks.shift();
        yield task(this.ctx);
    }
}

function getDaysOfThisWeek() {
    //const dateOfToday = new Date().getTime();
    const dateOfToday = Date.now();
    const dayOfToday = (new Date().getDay() + 7 - 1) % 7;
    //return Array.from(new Array(7)).map((_, i) => new Date(dateOfToday + (i - dayOfToday) * 1000 * 60 * 60 * 24));
    return Array.from(new Array(7)).map((_, i) => {
        const date = new Date(dateOfToday + (i - dayOfToday) * 1000 * 60 * 60 * 24)
        return date.getFullYear() +
            '-' +
            String(date.getMonth() + 1).padStart(2, '0') +
            '-' +
            String(date.getDate()).padStart(2, '0')
    })
}

const myDate = {
    /**
    * 获取指定日期的周的第一天、月的第一天、季的第一天、年的第一天
    * @param date new Date()形式，或是自定义参数的new Date()
    * @returns 返回值为格式化的日期，yy-mm-dd
    */
    //日期格式化，返回值形式为yy-mm-dd
    timeFormat(date) {
        if (!date || typeof (date) === "string") {
            this.error("参数异常，请检查...");
        }
        var y = date.getFullYear(); //年
        var m = date.getMonth() + 1; //月
        var d = date.getDate(); //日

        return y + "-" + m + "-" + d;
    },

    //获取这周的周一
    getFirstDayOfWeek(date = new Date()) {
        var weekday = date.getDay() || 7; //获取星期几,getDay()返回值是 0（周日） 到 6（周六） 之间的一个整数。0||7为7，即weekday的值为1-7
        date.setDate(date.getDate() - weekday + 1);//往前算（weekday-1）天，年份、月份会自动变化
        return this.timeFormat(date);
    },

    //获取当月第一天
    getFirstDayOfMonth(date = new Date()) {
        date.setDate(1);
        return this.timeFormat(date);
    },

    //获取当季第一天
    getFirstDayOfSeason(date = new Date()) {
        var month = date.getMonth();
        if (month < 3) {
            date.setMonth(0);
        } else if (2 < month && month < 6) {
            date.setMonth(3);
        } else if (5 < month && month < 9) {
            date.setMonth(6);
        } else if (8 < month && month <= 11) {
            date.setMonth(9);
        }
        date.setDate(1);
        return this.timeFormat(date);
    },

    //获取当年第一天
    getFirstDayOfYear(date = new Date()) {
        date.setDate(1);
        date.setMonth(0);
        return this.timeFormat(date);
    }
};

module.exports = {
    act,
    TaskQuery,
    log,
    randomString,
    mergeOptions,
    getArray0,
    getParamValue,
    isDispatched,
    pushMsg,
    createId,
    getDaysOfThisWeek,
    myDate
};