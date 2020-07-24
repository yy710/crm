const assert = require('assert');
const fs = require('fs');
const express = require('express');
const XLSX = require('xlsx');
const MongoClient = require('mongodb').MongoClient;
const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');
const Redis = require('ioredis');
const redis = new Redis();

const { getToken } = require('../class-token');
const { getUserInfoFromCode } = require('../class-user');
const sign = require('../sign');
const config = require('../config.json').reimburse;
//const { getParamValue } = require('../common');

const router = express.Router();
const routerAPI = express.Router();
router.use('/html', express.static('routers/src-reimburse'));
router.use('/api', routerAPI);

// connect db, then get access_token and jsapi_ticket
// output: req.data.db, req.data.access_token, req.dat.jsapi_ticket
routerAPI.use(async function (req, res, next) {
  if (!req.data) req.data = {};
  req.data.url = decodeURIComponent(req.query.url);
  try {
    const client = await MongoClient.connect(config.dbUrl, { useUnifiedTopology: true });
    client && console.log('connect to mongodb success!');
    req.data.db = client.db('reimburse');
    const colTokens = req.data.db.collection('tokens');
    const { access_token, jsapi_ticket } = await getToken(config, colTokens);
    req.data = { ...req.data, access_token, jsapi_ticket };
    // res.json({ access_token, jsapi_ticket });
    next();
  } catch (error) {
    console.log(error);
  }
});

routerAPI.get('/download', function (req, res, next) {
  const { start, end, op } = req.query;
  const startTime = start ? new Date(parseInt(start)) : 0;
  const endTime = end ? new Date(parseInt(end)) : new Date();

  req.data.db
    .collection('tests')
    .aggregate([{ $match: { 'order.create_time': { $gte: startTime, $lte: endTime } } }, { $sort: { _id: -1 } }])
    .toArray()
    .then(r => {
      const _r = r.map(rf => {
        //console.log(rf);
        return {};
      });
      //console.log(_r);
      /* converts an array of JS objects to a worksheet */
      const worksheet = XLSX.utils.json_to_sheet(_r);
      let new_workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(new_workbook, worksheet, 'SheetJS');
      dl();

      function dl2(params) {
        /* output format determined by filename */
        const url = XLSX.writeFile(new_workbook, 'out.xlsx');
        res.download('./out.xlsx');
      }

      function dl(params) {
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        /* at this point, out.xlsb will have been downloaded */
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent('谊众转介绍信息')}.xlsx";`);
        //res.setHeader('Content-Type', 'application/vnd.ms-excel;');
        //res.setHeader('Content-Type', 'application/vnd.openxmlformats;charset=utf-8');
        //res.setHeader('Content-Type', 'application/octet-stream;charset=utf-8');
        //res.setHeader('Content-Transfer-Encoding', 'binary');
        //res.setHeader('Content-Type', 'text/html;');
        res.end(XLSX.write(new_workbook, { type: 'buffer', bookType: 'xlsx' }));
        //res.status(200).send(XLSX.write(new_workbook, { type: "buffer", bookType: "xlsx" }));
      }
    })
    .catch(err => console.log(err));
});

routerAPI.use('/get-user', getSign(), getUserInfoFromCode(), (req, res, next) => {
  const user = req.data.user || {};
  res.json({ errcode: 0, errmsg: 'success', content: { user, sign: req.data.sign } });
});

routerAPI.get('/pdf', async function (req, res, next) {
  const pdfPath = await createPdf('https://www.baidu.com/');
  console.log({ pdfPath });
  res.attachment(pdfPath);
  //res.json({ errcode: 0, errmsg: 'success', content: pdfPath });
});

routerAPI.get('/pdf2', async function (req, res, next) {
  // res.setHeader('Content-Transfer-Encoding', 'binary');
  // res.setHeader('Content-Type', 'application/pdf');
  // res.setHeader('Content-Disposition', `attachment; filename="555.pdf";`);
  res.attachment('666.pdf');
  res.type('application/pdf');
  const pdfBuff = await createPdf('https://www.baidu.com/');
  res.end(pdfBuff);

  //res.download('./routers/src-reimburse/222.pdf');
  //res.json({ errcode: 0, errmsg: 'success', content: 'pdfPath' });
});

// 文件下载  将pdf文件转为流的形式，传到前端，实现下载功能
routerAPI.get('/111.pdf', (req, res) => {
  // let { id } = req.query;
  var path="./routers/src-reimburse/111.pdf";
  // var path = `public/pdf/${id}.pdf`;
  var fileStream = fs.createReadStream(path);
  res.setHeader('Content-type', 'application/octet-stream');
  res.setHeader('Content-Disposition', 'attachment;filename=123.pdf');
   //res.setHeader('Content-Disposition', `'attachment;filename=${id}.pdf'`);
  fileStream.on('data', function (data) {
    res.write(data, 'binary');
  });
  fileStream.on('end', function () {
    res.end();
    console.log('The file has been downloaded successfully!');
  });
});

module.exports = router;

// -------------------------------
function getSign() {
  return function (req, res, next) {
    const { jsapi_ticket, url } = req.data;
    const s = sign(jsapi_ticket, url);
    console.log('sign(): ', s);
    delete s.jsapi_ticket;
    delete s.url;
    req.data.sign = s;
    next();
  };
}

async function createPdf(url) {
  // const fileName = uuidv4() + '.pdf';
  // const fileName = '333.pdf';
  // const path = './routers/src-reimburse/' + fileName;
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: 'networkidle2' });
  const pdfBuff = await page.pdf({ format: 'A4', printBackground: true });
  await browser.close();
  return pdfBuff;
}
