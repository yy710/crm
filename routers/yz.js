const accessToken = require('../access_token');
const jsapiTicket = require('../jsapi_ticket');
const getUser = require('../get-user');
const sign = require('../sign');

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

    router.use('/referred', routerReferred)

    routerReferred.use('/new', (req, res, next) => {
        console.log("req.query: \n", req.query);
        res.json({ msg: "ok!" });
    });

    routerReferred.use('/getToken',
        routerAccessToken,
        (req, res, next) => {
            //console.log('global.token: ', global.token);
            res.json({ msg: "getToken ok!" });
        }
    );

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
            console.log("sign(): ", s);
            delete s.jsapi_ticket;
            delete s.url;
            res.json(s);
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