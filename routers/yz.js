const accessToken = require('../access_token');
const jsapiTicket = require('../jsapi_ticket');
const getUser = require('../get-user');
const sign = require('../sign');
const referred = require('../referred');
const { replyEchostr, handleMsg } = require('../wx-msg');
const config = require('../config.json');
const XLSX = require('xlsx');
const { getParamValue } = require('../common');

module.exports = function (express) {
    const router = express.Router();
    const routerReferred = express.Router();
    const routerAccessToken = express.Router();
    const routerJsapiTicket = express.Router();

    routerAccessToken.use(
        accessToken.find(),
        accessToken.checkout(),
        accessToken.getNewToken(),
        accessToken.saveToDb()
    );

    routerJsapiTicket.use(
        jsapiTicket.find(),
        jsapiTicket.checkout(),
        jsapiTicket.getNewTicket(),
        jsapiTicket.saveToDb()
    );

    router.use(routerAccessToken);
    router.use('/referred', routerReferred);

    routerReferred.get('/msg', replyEchostr());

    routerReferred.post('/msg',
        handleMsg(),
        referred.accept(),
        referred.dispatchPre(),
        referred.dispatch());

    routerReferred.get('/download', function (req, res, next) {
        const col = req.data.db.collection('referreds');
        col.aggregate([{ $match: {} }, { $sort: { "_id": -1 } }]).toArray().then(r => {
            const act = new Map([
                ["new", " 新建信息"],
                ["dispatch", "指派顾问"],
                ["dispatched", "指派顾问"],
                ["accept", "接受指派"],
                ["accepted", "接受指派"],
                ["proceed", "洽谈中"],
                ["success", "已成交"],
                ["ordered", "已订车"],
                ["fail", "战败"]
            ]);
            const _r = r.map(item => {
                return {
                    "订单号": item.id,
                    "订单状态": act.get(item.state),
                    "客户姓名": item.order.potential_customer.name,
                    "客户电话": item.order.potential_customer.phone || item.order.potential_customer.mobile,
                    "介绍人姓名": item.order.from_customer.name,
                    "介绍人电话": item.order.from_customer.phone || item.order.from_customer.mobile,
                    "创建人姓名": item.tracks[0].data.operator.name,
                    "创建人电话": item.tracks[0].data.operator.phone || item.tracks[0].data.operator.mobile,
                    "订单创建时间": item.tracks[0].update_time.toLocaleString(),
                    "指派顾问": item.order.dispatch_employer.name,
                    "意向车型": item.order.carType,
                    "来源类型": item.order.source_type
                };
            });
            //console.log(_r);
            /* converts an array of JS objects to a worksheet */
            const worksheet = XLSX.utils.json_to_sheet(_r);
            let new_workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(new_workbook, worksheet, "SheetJS");
            dl();

            function dl2(params) {
                /* output format determined by filename */
                const url = XLSX.writeFile(new_workbook, 'out.xlsx');
                res.download('./out.xlsx');
            }

            function dl(params) {
                res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
                /* at this point, out.xlsb will have been downloaded */
                res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent("谊众转介绍信息")}.xlsx";`);
                //res.setHeader('Content-Type', 'application/vnd.ms-excel;');
                //res.setHeader('Content-Type', 'application/vnd.openxmlformats;charset=utf-8');
                //res.setHeader('Content-Type', 'application/octet-stream;charset=utf-8');
                //res.setHeader('Content-Transfer-Encoding', 'binary');
                //res.setHeader('Content-Type', 'text/html;');
                res.end(XLSX.write(new_workbook, { type: "buffer", bookType: 'xlsx' }));
                //res.status(200).send(XLSX.write(new_workbook, { type: "buffer", bookType: "xlsx" }));
            }

        }).catch(err => console.log(err));
        //res.json({msg: "ok!"});
    });

    routerReferred.use('/dispatch',
        (req, res, next) => {
            req.query.operator = JSON.parse(req.query.operator);
            req.query.employer = JSON.parse(req.query.employer);
            next();
        },
        referred.dispatch());

    routerReferred.use('/new',
        (req, res, next) => {
            req.query.operator = JSON.parse(req.query.operator);
            next();
        },
        referred.new(),
        (req, res, next) => {
            res.json({ err: 0, msg: "新信息创建成功！" });
        });

    routerReferred.use('/getToken',
        routerAccessToken,
        (req, res, next) => {
            //console.log('global.token: ', global.token);
            res.json({ msg: "getToken ok!" });
        }
    );

    routerReferred.use('/get-referred', (req, res, next) => {
        const rid = req.query.id;
        const rphone = req.query.customerPhone;
        const query = rid ? { id: rid } : { "order.potential_customer.phone": rphone };
        req.data.db.collection('referreds').findOne(query).then(r => {
            console.log("get-referred: ", r);
            res.json(r);
        }).catch(err => console.log(err));
    });

    routerReferred.use('/get-referreds', (req, res, next) => {
        const admins = config.referred.adminId.split('|');
        //console.log("admins: ", admins)

        function myReferreds(isAdmin) {
            const col = req.data.db.collection('referreds');
            if (isAdmin) return col.aggregate([{ $match: {} }, { $sort: { "_id": -1 } }]).limit(50).toArray();
            return col.find({ "order.dispatch_employer.id": req.query.op }).toArray();
        }

        // checout is admin?
        let isAdmin = false;
        for (i = 0; i < admins.length; i++) {
            if (req.query.op == admins[i]) {
                isAdmin = true;
                break;
            }
        }

        myReferreds(isAdmin)
            //.then(log("myReferreds(): "))
            .then(r => res.json({ msg: "ok", referreds: r }))
            .catch(err => console.log(err));
    });

    routerReferred.use('/commit', referred.commit(), (req, res, next) => {
        res.json({ code: 0, msg: "提交成功！" });
    });

    routerReferred.use('/get-jsapi-ticket',
        routerAccessToken,
        routerJsapiTicket,
        (req, res, next) => {
            req.data.url = decodeURIComponent(req.query.url);
            req.query.code = req.query.code || getParamValue(req.data.url, "code");
            //console.log("req.query.code: ", req.query.code);
            next();
        },
        getUser(),
        (req, res, next) => {
            const s = sign(global.jsapi_ticket.ticket, req.data.url);
            //console.log("sign(): ", s);
            delete s.jsapi_ticket;
            delete s.url;

            let user = {};
            if (req.data.user) {
                user.id = req.data.user.userid;
                user.name = req.data.user.name;
                user.mobile = req.data.user.mobile;
            }
            res.json({ user: user, sign: s });
        }
    );

    return router;
}