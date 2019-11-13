const json1 = {
    potential_customer: { id: 1, name: "关羽", phone: "13768667656" },
    dispatch_employ: { id: 5, name: "赵云", phone: "12565678767" },
    from_customer: { id: 6, name: "刘备", phone: "12565767876" },
    source_type: "转介绍",
    state: "new",
    tracks: [
        {
            action: "create",
            update_time: new Date(),
            operator: { id: 12, name: "张飞", phone: "13812567656" },
            data: {}
        }
    ]
};

class Referred {
    constructor(data = {}) {
        /* this.potential_customer = { id: 1, name: "关羽", phone: "13768667656" };
        this.dispatch_employ = { id: 5, name: "赵云", phone: "12565678767" };
        this.from_customer = { id: 6, name: "刘备", phone: "12565767876" };
        this.source_type = "转介绍";
        this.state = "new";
        this.tracks = [
            {
                action: "create",
                update_time: new Date(),
                operator: { id: 12, name: "张飞", phone: "13812567656" },
                data: {}
            }
        ]; */

        this.data = data;
        this.actions = {};
        this.mutations = {
            accept: () => {
                this.data.tracks.push({
                    action: "accept",
                    update_time: new Date(),
                    operator: { id: 11, name: "马超", phone: "111" },
                    data: this.data
                });
                this.state = "accept";
            }
        };
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

module.exports = Referred;