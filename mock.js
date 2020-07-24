const json = {
  exams_list: [
    {
      _id: '5f093b24b11d5205addd152f',
      name: '新迈腾&新迈腾GTE&车联网内部转训',
      colName: 'yz_questions',
      score: 100,
      qsAmount: 45
    }
  ],

  yz_questions: [
    {
      _id: '5f093b24b11d5205addd1530',
      tag: '新迈腾&新迈腾GTE&车联网内部转训',
      title: '下面关于新迈腾和帕萨特(2020款)的说法，错误的是()(2分)',
      type: 1,
      score: 2,
      options: [
        {
          option: '帕萨特未配备门斗植绒',
          correct: false
        },
        {
          option: '新迈腾配备了旋钮式空调',
          correct: true
        },
        {
          option: '新迈腾配备了车联网功能',
          correct: false
        },
        {
          option: '帕萨特配备了车联网功能',
          correct: false
        }
      ]
    }
  ],

  user_exams: {
    _id: '5f09eeb0e5804f0cdb0763e5',
    user: 'gxSf3PveDXl9',
    exam_name: '新迈腾&新迈腾GTE&车联网内部转训',
    score: 0,
    start_time: 1594486448380,
    end_time: null,
    currentQs: 1,
    tests: [
      {
        question_id: ObjectId('5f093b24b11d5205addd1554'),
        title: '新迈腾GTE混合动力系统最大功率()kW，最大扭矩()Nm(2分)',
        type: 1,
        optionList: [
          {
            id: 'A',
            content: '137；380'
          },
          {
            id: 'B',
            content: '137；420'
          },
          {
            id: 'C',
            content: '162；420'
          },
          {
            id: 'D',
            content: '155；400'
          }
        ],
        answer: 'D',
        userAnswer: '',
        userFavor: false,
        explain: ''
      }
    ]
  }
};
