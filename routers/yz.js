module.exports = function (express) {
    const router = express.Router();
    const routerReferred = express.Router();
    
    router.use('/referred', routerReferred)

    routerReferred.use('/add-new-case', (req, res, next) => {
        res.send("aaa");
    });

    return router;
};