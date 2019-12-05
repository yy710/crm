// 数据结构
const data = {
    // 识别ID
    id: 0,
    // 订单基础信息，通常不需要更改
    order: {
        potential_customer: { id: 1, name: "关羽", phone: "13768667656" },
        dispatch_employer: { id: 5, name: "赵云", phone: "12565678767" },
        from_customer: { id: 6, name: "刘备", phone: "12565767876" },
        creater: { id, name, mobile },
        carType: "宝来",
        source_type: "转介绍"
    },
    // 订单当前状态
    state: "new",
    // task
    sendMsgs: [{ action, touser, task_id }],
    // 订单跟踪记录
    tracks: [
        {
            action: "new",
            update_time: new Date(),
            operator: { id: 12, name: "张飞", mobile: "13812567656" },
            data: {}
        },
        {
            action: "dispatch",
            update_time: new Date(),
            operator: {},
            data: { employer: {} }
        },
        {
            action: "accept",
            update_time: new Date(),
            operator: {},
            data: { employer: {} }
        },
        {
            action: "commit",
            update_time: new Date(),
            operator: {},
            data: { employer: {} }
        },
        {
            action: "end",
            update_time: new Date(),
            operator: {},
            data: { employer: {} }
        }
    ]
};

/**
 * sim to rdux
 */
class Referred {
    constructor(data = {}) {
        this.data = data;
        // 异步操作 async
        this.actions = {
            new: () => {

            }
        };
        // 同步操作 sync
        this.mutations = [
            {
                accept: () => {
                    this.data.tracks.push({
                        action: "accept",
                        update_time: new Date(),
                        operator: { id: 11, name: "马超", phone: "111" },
                        data: this.data
                    });
                    this.state = "accept";
                }
            }
        ]

    }

    dispatch() {

    }

    commit(mutation) {

    }

    show() {
        console.log(JSON.stringify(this.data, null, 4));
    }

    get() {

    }
}

module.exports = {
    data,
    Referred
};