module.exports = function (express) {
    const router = express.Router();
    const routerReferred = express.Router();
    
    router.use('/referred', routerReferred)

    routerReferred.use('/new', (req, res, next) => {
        //console.log("req.query: \n", JSON.stringify(req.query, null, 4));
        console.log("req.data: \n", req.data);
        res.json({msg: "ok!"});
    });

    return router;
};