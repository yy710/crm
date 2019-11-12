const accessToken = require('../access_token');
const jsapiTicket = require('../jsapi_ticket');
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
            const s = sign(global.jsapi_ticket.ticket, 'http://www.all2key.cn/new-referred.html');
            console.log("sign(): ", s);
            res.json(s);
        }
    );

    return router;
}