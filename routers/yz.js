const accessToken = require('../access_token');

module.exports = function (express) {
    const router = express.Router();
    const routerReferred = express.Router();

    router.use('/referred', routerReferred)

    routerReferred.use('/new', (req, res, next) => {
        // console.log("req.data: \n", req.data);
        res.json({ msg: "ok!" });
    });

    routerReferred.use('/getToken',
        accessToken.find(),
        accessToken.checkout(),
        accessToken.getNewToken(),
        accessToken.saveToDb(),
        (req, res, next) => {
            //console.log('global.token: ', global.token);
            res.json({ msg: "getToken ok!" });
        });

    return router;
}