module.exports = function (express) {
    const router = express.Router();
    const routerReferred = express.Router();
    
    router.use('/referred', routerReferred)

    routerReferred.use('/new', (req, res, next) => {
        res.json({msg: "ok!"});
    });

    return router;
};