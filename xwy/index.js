const multer = require('multer');
const upload = multer({
    dest: './xwy/uploads/'
});
const excel = require('../excel.js');
const Vue = require('vue');
const renderer = require('vue-server-renderer').createRenderer();
const createApp = require('./app');

module.exports = function (express) {
    const router = express.Router();

    router.use(function (req, res, next) {
        //console.log("req.data", req.data);
        next();
    });

    //router.use('/a', log('good!'), express.static(__dirname + '/public'));
    //router.use(express.static(__dirname + '/public'));
    router.use(express.static('public')); // notic path!

    router.post('/upload', (req, res, next) => {
        res.json({
            msg: "request ok!"
        });
        //res.render('learning-english', {title: '学英语的鱼'});
        next();
    }, upload.single('excel'), function (req, res, next) {
        excel.xlsxToDb(req.file.path, req.data.db, "xwya");
    });

    router.use('/start', function (req, res, next) {
        const app = new Vue({
            data: {
                url: req.url
            },
            template: `<div>The visited URL is: {{ url }}</div>`
        });

        renderer.renderToString(app, (err, html) => {
            if (err) {
                res.status(500).end('Internal Server Error')
                return
            };
            res.end(`
              <!DOCTYPE html>
              <html lang="en">
                <head><title>Hello</title></head>
                <body>${html}</body>
              </html>
            `);
        });
    });

    router.get('/vue', function (req, res, next) {
        const context = {
            url: req.url
        };
        const app = createApp(context);

        renderer.renderToString(app, (err, html) => {
            // handle error...
            if (err) {
                res.status(500).end('Internal Server Error')
                return
            };
            res.end(html)
        });
    });

    router.get('/get-table', function(req, res, next){
        const db = req.data.db;
        db.collection('xwya').find().limit(10).toArray((err,doc)=>res.json(doc));
    });

    return router;
};

function log(text) {
    return function (req, res, next) {
        console.log(text);
        next();
    };
}