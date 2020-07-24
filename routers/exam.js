const assert = require('assert');
const express = require('express');
const XLSX = require('xlsx');
const MongoClient = require('mongodb').MongoClient;
const { v4: uuidv4 } = require('uuid');
//const puppeteer = require('puppeteer');
const Redis = require('ioredis');
const redis = new Redis();

const { getToken } = require('../class-token');
const { getUserInfoFromCode } = require('../class-user');
const sign = require('../sign');
const config = require('../config.json').exam;
const { getParamValue, log } = require('../common');
const { urlencoded } = require('body-parser');

const router = express.Router();
const routerAPI = express.Router();
router.use('/html', express.static('routers/src-exam/h5'));
router.use('/api', routerAPI);

// connect db, then get access_token and jsapi_ticket
// output: req.data.db, req.data.access_token, req.dat.jsapi_ticket
routerAPI.use(async function (req, res, next) {
  if (!req.data) req.data = {};
  req.data.url = decodeURIComponent(req.query.url);
  try {
    const client = await MongoClient.connect(config.dbUrl, { useUnifiedTopology: true });
    client && console.log('connect to mongodb success!');
    req.data.db = client.db('exam');
    const colTokens = req.data.db.collection('tokens');
    const { access_token, jsapi_ticket } = await getToken(config, colTokens);
    req.data = { ...req.data, access_token, jsapi_ticket };
    // redis.set('ticket', jsapi_ticket);
    // res.json({ access_token: token.access_token, ticket: token.jsapi_ticket });
    // res.json({ ticket: await redis.get('ticket') });
    next();
  } catch (error) {
    console.log(error);
  }
});

routerAPI.get('/add-user', async function (req, res, next) {
  console.log('req.query: ', req.query);
  const { userName, pwd } = req.query;
  let user = await redis.get(userName);

  if (user) {
    res.json({ errcode: 5, errmsg: '用户名已存在！', content: user });
  } else {
    const sid = uuidv4();
    user = { userName, pwd, sid, inWorkWx: false };
    await redis.set(userName, JSON.stringify(user));
    res.json({ errcode: 0, errmsg: 'success', content: user });
  }
});

routerAPI.get('/login', async function (req, res, next) {
  console.log('req.query: ', req.query);
  const { userName, pwd, sid } = req.query;
  const _user = await redis.get(userName);
  const user = _user ? JSON.parse(_user) : null;
  if (user && (user.pwd == pwd || user.sid == sid)) {
    delete user.pwd;
    res.json({ errcode: 0, errmsg: 'success', content: user });
  } else {
    res.json({ errcode: 3, errmsg: 'auth fail', content: {} });
  }
});

routerAPI.get('/download', function (req, res, next) {
  const { userName, sid, exam_name, action } = req.query;
  console.log('req.query: ', req.query);

  req.data.db
    .collection('user_exams')
    .aggregate([{ $match: { exam_name, currentQs: -1 } }, { $sort: { _id: -1 } }])
    .toArray()
    .then(exams => {
      const r = exams.map(exam => {
        //console.log(rf);
        if (action == 'download') {
          return {
            考卷名称: exam.exam_name,
            员工姓名: exam.userName || exam.user,
            考试成绩: exam.score,
            共计用时: formatDuring(exam.end_time - exam.start_time)
          };
        } else if (action == 'view') {
          return {
            examName: exam.exam_name,
            userName: exam.userName || exam.user,
            score: exam.score,
            time: formatDuring(exam.end_time - exam.start_time)
          };
        }
      });

      console.log(r);
      if (action == 'download') {
        /* converts an array of JS objects to a worksheet */
        const worksheet = XLSX.utils.json_to_sheet(r);
        let new_workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(new_workbook, worksheet, 'SheetJS');
        dl(new_workbook, encodeURIComponent(exam_name));
      } else if (action == 'view') {
        res.json({ errcode: 0, errmsg: 'success', content: r });
      }

      function formatDuring(mss) {
        var days = parseInt(mss / (1000 * 60 * 60 * 24));
        var hours = parseInt((mss % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        var minutes = parseInt((mss % (1000 * 60 * 60)) / (1000 * 60));
        var seconds = Math.round((mss % (1000 * 60)) / 1000);
        // return days + " 天 " + hours + " 小时 " + minutes + " 分钟 " + seconds + " 秒 ";
        return hours + ' 小时 ' + minutes + ' 分钟 ' + seconds + ' 秒 ';
      }

      function dl2(params) {
        /* output format determined by filename */
        const url = XLSX.writeFile(new_workbook, 'out.xlsx');
        res.download('./out.xlsx');
      }

      function dl(new_workbook, fileName) {
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        /* at this point, out.xlsb will have been downloaded */
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}.xlsx";`);
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

routerAPI.get('/all-exams-list', async function (req, res, next) {
  const examsList = await req.data.db.collection('exams_list').find({ colName: 'yz_questions' }).toArray();
  const r = examsList.map(item => item.name);
  res.json({ errcode: 0, errmsg: 'success', content: r });
});

routerAPI.use('/get-user', getSign(), getUserInfoFromCode(), async (req, res, next) => {
  const user = req.data.user || {};
  let r_user = JSON.parse(await redis.get(user.name));
  if (!r_user && user.name) {
    r_user = { userName: user.name, sid: user.userid, inWorkWx: true };
    await redis.set(r_user.userName, JSON.stringify(r_user));
  }
  const r = { errcode: 0, errmsg: 'success', content: { user: r_user, sign: req.data.sign } };
  // const r = { errcode: 0, errmsg: 'success', content: { user: { userName: "test", sid: 'aaa', inWorkWx: true }, sign: req.data.sign } };
  console.log('res.json(%s)', JSON.stringify(r));
  res.json(r);
});

routerAPI.get('/pdf', function (req, res, next) {
  res.json({ errcode: 0, errmsg: 'success' });
});

routerAPI.get('/get-exams-list', async function (req, res, next) {
  const { sid: user } = req.query;
  const _examsList = await req.data.db.collection('exams_list').find({ colName: 'yz_questions' }).toArray();
  const userExams = await req.data.db.collection('user_exams').find({ user }).toArray();
  const examsList = _examsList.map(element => {
    const userExam = userExams.find(e => e.exam_name == element.name);
    if (userExam) {
      delete userExam.tests;
      delete userExam._id;
      delete userExam.user;
      delete userExam.exam_name;
      element.test = userExam;
    } else {
      element.test = { score: 0, currentQs: 0 };
    }
    //element.name = encodeURIComponent(element.name);
    delete element._id;
    return element;
  });
  res.json({ errcode: 0, errmsg: 'success', content: examsList });

  // const col = req.data.db.collection('questions');
  // col
  //   .aggregate([{ $match: {} }, { $group: { _id: '$tag', count: { $sum: 1 } } }])
  //   .toArray()
  //   .then(log('get-tags: '))
  //   .then(docs => {
  //     res.json({ errcode: 0, errmsg: 'success', content: docs });
  //   })
  //   .catch(err => log('get-tags error: '));
});

routerAPI.get('/answer', function (req, res, next) {
  // console.log("req.query: ", req.query);
  const { sid: user, exam_name, answers } = req.query;
  // console.log("req.body: ", req.body);
  const userAnswers = answers.split(',');
  req.data.db.collection('user_exams').findOne({ user, exam_name }, function (err, exam) {
    assert.equal(null, err);
    if (exam.currentQs == -1) {
      res.json({ errcode: 1, errmsg: '此试卷已提交过答案，不能重复考试！', content: exam });
      return 0;
    }
    let score = 0;
    for (let i = 0; i < exam.tests.length; i++) {
      exam.tests[i].userAnswer = userAnswers[i];
      if (exam.tests[i].answer == userAnswers[i]) {
        score = score + exam.tests[i].score;
      }
    }

    function getScore(tests) {
      //
    }

    req.data.db
      .collection('user_exams')
      .updateOne({ user, exam_name }, { $set: { score, end_time: new Date().getTime(), currentQs: -1, tests: exam.tests } }, { upsert: false }, function (
        err,
        r
      ) {
        assert.equal(null, err);
        req.data.db.collection('user_exams').findOne({ user, exam_name }, function (err, exam) {
          assert.equal(null, err);
          res.json({ errcode: 0, errmsg: 'test', content: exam });
        });
      });
  });
});

routerAPI.get('/get-exam', async function (req, res, next) {
  console.log('req.query: ', req.query);
  const { sid: user, name: exam_name, colName, currentQs, userName } = req.query;
  if (!user) {
    // console.log("user: ", user);
    res.json({ errcode: 2, errmsg: '非注册用户！' });
    return 0;
  }
  // const exam_name = decodeURIComponent(name);
  let tests = null;

  if (currentQs == 0) {
    // create new test
    const questions = await req.data.db.collection(colName).find({ tag: exam_name }).toArray();
    console.log('questions.length: ', questions.length);
    // 洗牌算法(Fisher–Yates)
    const _tests = shuffle(questions);

    tests = _tests.map(item => {
      let answer = '';

      const optionList = shuffle(item.options).map((op, index) => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        if (op.correct) answer += chars[index];
        return { id: chars[index], content: op.option };
      });

      return {
        question_id: item._id,
        title: item.title,
        type: item.type, //types.get(item.type),
        optionList,
        answer,
        score: item.score,
        userAnswer: '',
        userFavor: false,
        explain: ''
      };
    });

    const userExam = {
      user,
      userName,
      exam_name,
      score: 0,
      start_time: new Date().getTime(),
      end_time: null,
      currentQs: 1,
      tests
    };
    // console.log("userExam: ", userExam);
    const r = await req.data.db.collection('user_exams').replaceOne({ user, exam_name }, userExam, { upsert: true });
  } else {
    userExam = await req.data.db.collection('user_exams').findOne({ user, exam_name });
    tests = userExam.tests;
  }

  res.json({ errcode: 0, errmsg: 'success', content: tests });
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

function randomFetchOne(arr) {
  //console.log({ arr });
  if (!Array.isArray(arr) || arr.length === 0) return false;
  const index = Math.floor(Math.random() * arr.length);
  const res = arr[index];
  arr.splice(index, 1);
  return res;
}

function randomCreate(arr, newArr) {
  // console.log("arr1: ", arr);
  if (arr.length === 0) return newArr;
  newArr.push(randomFetchOne(arr));
  // console.log("newArr: ", newArr);
  // console.log("arr2: ", arr);
  randomCreate(arr, newArr);
}

function shuffle(arr) {
  let i = arr.length;
  while (--i) {
    let j = Math.floor(Math.random() * i);
    [arr[j], arr[i]] = [arr[i], arr[j]];
  }
  return arr;
}
