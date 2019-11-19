const accessToken = require('../access_token');
const jsapiTicket = require('../jsapi_ticket');
const getUser = require('../get-user');
const sign = require('../sign');
const referred = require('../referred');
const { replyEchostr, handleMsg } = require('../wx-msg');

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

    routerReferred.post('/msg', handleMsg(), referred.accept());

    routerReferred.use('/dispatch',
        (req, res, next) => {
            //console.log("req.query: \n", req.query);
            req.query.operator = JSON.parse(req.query.operator);
            req.query.employer = JSON.parse(req.query.employer);
            console.log("req.query: \n", req.query);
            next();
        },
        referred.dispatch(),
        (req, res, next) => {
            res.json({ err: 0, msg: "分配成功！" });
        });

    routerReferred.use('/new',
        (req, res, next) => {
            req.query.operator = JSON.parse(req.query.operator);
            console.log("req.query: \n", req.query);
            next();
        },
        referred.new(),
        (req, res, next) => {
            res.json({ err: 0, msg: "保存成功！" });
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
        req.data.db.collection('referreds').findOne({ id: rid }).then(r => {
            console.log("get-referred: ", r);
            res.json(r);
        }).catch(err => console.log(err));
    });

    routerReferred.use('/get-referreds', (req, res, next) => {
        console.log("req.query", req.query);
        res.json({ msg: "ok" });
    });

    routerReferred.use('/commit', referred.commit(), (req, res, next) => {
        console.log("commit req.query: ", req.query);
        res.json({ code: 0, msg: "提交成功！" });
    });

    routerReferred.use('/get-jsapi-ticket',
        routerAccessToken,
        routerJsapiTicket,
        (req, res, next) => {
            req.data.url = decodeURIComponent(req.query.url);
            req.query.code = req.query.code || getParamValue(req.data.url, "code");
            console.log("req.query.code: ", req.query.code);
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

function getParamValue(url, key) {
    const regex = new RegExp(key + "=([^&]*)", "i");
    const ret = url.match(regex);
    if (ret != null) return (ret[1]);
    return null;
}