const accessToken = require('../access_token');
const jsapiTicket = require('../jsapi_ticket');
const getUser = require('../get-user');
const sign = require('../sign');
const { referred, mw } = require('../referred');
const { replyEchostr, handleMsg } = require('../wx-msg');
const config = require('../config.json');
const XLSX = require('xlsx');
const { getParamValue, act, getDaysOfThisWeek, myDate } = require('../common');

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
        mw.accept(),
        mw.dispatchPre(),
        mw.dispatch());

    routerReferred.get('/download', function (req, res, next) {
        const col = req.data.db.collection('referreds');
        const getValue = (input, defaultVaule) => {
            try {
                return input;
            } catch (error) {
                return defaultVaule;
            }
        };
        col.aggregate([{ $match: {} }, { $sort: { "_id": -1 } }]).toArray().then(r => {
            const _r = r.map(rf => {
                //console.log(rf);
                return {
                    "订单号": rf.id,
                    "订单状态": act.get(rf.state),
                    "客户姓名": rf.order.potential_customer.name,
                    "客户电话": rf.order.potential_customer.phone,
                    "介绍人姓名": rf.order.from_customer.name,
                    "介绍人电话": rf.order.from_customer.phone,
                    "创建人姓名": rf.tracks[0].data.operator.name,
                    "创建人电话": rf.tracks[0].data.operator.mobile,
                    "订单创建时间": rf.tracks[0].update_time.toLocaleString(),
                    "指派顾问": rf.order.dispatch_employer.name,
                    "意向车型": rf.order.carType || '',
                    "来源类型": rf.order.source_type
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
        mw.dispatch());

    routerReferred.use('/new', mw.new());

    routerReferred.use('/modify-referred', (req, res, next) => {
        res.json({ msg: "修改成功！" });
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
            //console.log("get-referred: ", r);
            res.json(r);
        }).catch(err => console.log(err));
    });

    routerReferred.use('/get-referreds', async (req, res, next) => {
        try {
            const maxRf = 25;
            const page = parseInt(req.query.page);
            const user = req.query.op;
            const col = req.data.db.collection('referreds');
            const admins = global.config && global.config.referred.adminId.split('|');
            const pipe = [{ $sort: { "_id": -1 } }, { $skip: page * maxRf }, { $limit: maxRf }, { $project: { "sendMsgs": 0 } }];
            let isAdmin = !!admins.find(u => u == user);
            // flite by  order state
            if (req.query.orderState != 'all') pipe.unshift({ $match: { "state": req.query.orderState } });

            function getRange(dateRange) {
                let day = null;
                switch (dateRange) {
                    case 'week':
                        day = myDate.getFirstDayOfWeek(new Date());
                        break;
                    case 'month':
                        day = myDate.getFirstDayOfMonth(new Date());
                        break;
                    case 'season':
                        day = myDate.getFirstDayOfSeason(new Date());
                        break;
                    case 'year':
                        day = myDate.getFirstDayOfYear(new Date());
                        break;
                    case 'all':
                        break;
                    default:
                        day = myDate.getFirstDayOfWeek(new Date());
                        break;
                }
                return day;
            }

            pipe.unshift({ $match: { "order.create_time": { $gte: new Date(getRange(req.query.timeRange)) } } });

            //1 ? pipe.unshift({ $match: { "order.create_time": { $gte: new Date(firstDayOfThisWeek) } } }) : pipe.unshift({ $match: { "order.dispatch_employer.id": user } });
            if (global.debug) console.log("pipe: ", JSON.stringify(pipe, null, 4));
            const referreds = await col.aggregate(pipe).toArray();
            if (global.debug) isAdmin = true;
            res.json({ msg: "ok", isAdmin, referreds, next: referreds.length == maxRf, page })
        } catch (error) {
            console.log("/get-referreds error: ", error)
        }
    });

    routerReferred.use('/commit', mw.commit(), (req, res, next) => res.json({ code: 0, msg: "提交成功！" }));

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

    routerReferred.use('/cron', require('./cron.js'));

    routerReferred.use('/addCreateTime', function (req, res, next) {
        const col = req.data.db.collection('referreds');
        col.find().toArray().then(rfs => {
            rfs.forEach(rf => {
                col.update({ id: rf.id }, { $set: { "order.create_time": rf.tracks[0].update_time } }, { upsert: false });
            });
        }).catch(err => console.log(err));
        res.json({ msg: "ok!" });
    });

    return router;
}