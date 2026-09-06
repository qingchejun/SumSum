/**
 * 知识点「27 余数的应用（一）」：认识余数 + 周期问题入门。
 * 核心思想：平均分分不完，多出来的是余数；周期/星期问题里，真正决定答案的是余数。
 * 变式：①带余分组（问装满几袋或剩几个）②周期问题（第 N 个是什么）③星期问题（再过 n 天是星期几）。
 */
(function (root) {
  'use strict'

  var U = root.SumSum.aoshu.util

  /* 各难度档的规模：t 总数上限、N 周期问题的序号上限、n 星期问题的天数上限 */
  var CAP = {
    L1: { t: 20, N: 20, n: 15 },
    L2: { t: 50, N: 50, n: 30 },
    L3: { t: 90, N: 100, n: 60 }
  }

  function cap(s) {
    return CAP[s.difficulty] || CAP.L1
  }

  /* 变式①带余分组：t = k×g + r，随机问「装满几袋」或「还剩几个」 */
  function genDivide(s) {
    var c = cap(s)
    var k = U.randInt(2, s.difficulty === 'L1' ? 5 : 9)
    var g = U.randInt(2, Math.min(9, Math.floor((c.t - 1) / k)))
    if (g < 2) return null
    var r = U.randInt(1, k - 1)
    var t = k * g + r
    if (t > c.t) return null
    var it = U.pick(U.ITEMS)
    var askBags = Math.random() < 0.5
    var base = t + ' ' + it.u + it.n + '，每 ' + k + ' ' + it.u + '装一袋，'
    return {
      topic: 'yushu1',
      variant: 'divide',
      stem: base + (askBags ? '能装满几袋？' : '装满后还剩几' + it.u + '？'),
      answer: askBags ? g : r,
      unit: askBags ? '袋' : it.u,
      ansLabel: askBags ? '答：能装满' : '答：还剩',
      ansSuffix: askBags ? '袋。' : it.u + it.n + '。',
      solution: [
        { tag: '想一想', text: '每 ' + k + ' ' + it.u + '一袋，就是看 ' + t + ' 里面有几个 ' + k + '、还多几' + it.u + '。' },
        { tag: '列算式', text: t + ' ÷ ' + k + ' = ' + g + '（袋）……' + r + '（' + it.u + '）。' },
        { tag: '验一验', text: g + ' 袋每袋 ' + k + ' ' + it.u + '，共 ' + k + ' × ' + g + ' = ' + k * g + ' ' + it.u + '，加上剩下的 ' + r + ' ' + it.u + '：' + k * g + ' + ' + r + ' = ' + t + ' ✓' },
        { tag: '答', text: askBags ? '能装满 ' + g + ' 袋（还剩 ' + r + ' ' + it.u + '不够一袋）。' : '装满 ' + g + ' 袋后，还剩 ' + r + ' ' + it.u + it.n + '。' }
      ],
      key: 'divide:' + t + ',' + k + ':' + (askBags ? 'g' : 'r')
    }
  }

  /* 周期串：全部单字符，方便去重键与验算 */
  var CYCLES = [
    { seq: ['红', '黄', '蓝'], kind: '颜色', verb: '排' },
    { seq: ['红', '黄', '蓝', '绿'], kind: '颜色', verb: '排' },
    { seq: ['●', '○', '△'], kind: '图形', verb: '画' },
    { seq: ['●', '○', '△', '□'], kind: '图形', verb: '画' }
  ]

  /* 变式②周期问题：p 个一组循环，第 N 个是什么（余 0 时是组里最后一个！） */
  function genCycle(s) {
    var c = cap(s)
    var cy = U.pick(CYCLES)
    var p = cy.seq.length
    var N = U.randInt(p + 2, c.N)
    var q = Math.floor(N / p)
    var r = N % p
    var ans = r === 0 ? cy.seq[p - 1] : cy.seq[r - 1]
    var shown = cy.seq.concat(cy.seq).join('、')
    var locate =
      r === 0
        ? '没有余数——第 ' + N + ' 个把第 ' + q + ' 组正好' + cy.verb + '完，就是一组的最后一个：' + cy.seq[p - 1] + '。'
        : '余 ' + r + '，第 ' + N + ' 个就是新一组里的第 ' + r + ' 个：' + cy.seq[r - 1] + '。'
    var checkParts = []
    if (r !== 0) {
      for (var i = 1; i <= r; i++) {
        checkParts.push('第 ' + (q * p + i) + ' 个是' + cy.seq[i - 1])
      }
    }
    var check =
      r === 0
        ? q + ' × ' + p + ' = ' + N + '，第 ' + N + ' 个正好排到组尾，组尾就是 ' + cy.seq[p - 1] + ' ✓'
        : '排完 ' + q + ' 整组用了 ' + q + ' × ' + p + ' = ' + q * p + ' 个，接着数：' + checkParts.join('、') + ' ✓'
    return {
      topic: 'yushu1',
      variant: 'cycle',
      stem: '按 ' + shown + '……的顺序一直' + cy.verb + '下去，第 ' + N + ' 个是什么' + cy.kind + '？',
      answer: ans,
      unit: '',
      ansLabel: '答：第 ' + N + ' 个是',
      ansSuffix: '。',
      workLabel: '规律',
      solution: [
        { tag: '想一想', text: '这串' + cy.kind + '是 ' + p + ' 个一组、一组一组重复的：' + cy.seq.join('、') + ' 是一组。' },
        { tag: '列算式', text: N + ' ÷ ' + p + ' = ' + q + '（组）' + (r === 0 ? '，正好排完，一个不多。' : '……' + r + '（个）。') },
        { tag: '找位置', text: locate },
        { tag: '验一验', text: check },
        { tag: '答', text: '第 ' + N + ' 个是' + ans + '。' }
      ],
      key: 'cycle:' + cy.seq.join('') + ':' + N
    }
  }

  var WEEK = ['一', '二', '三', '四', '五', '六', '日']

  /* 变式③星期问题：7 天一循环，再过 n 天是星期几（跨周要数对） */
  function genWeek(s) {
    var c = cap(s)
    var w = U.randInt(1, 7) // 1~7 = 星期一~星期日
    var n = U.randInt(5, c.n)
    var q = Math.floor(n / 7)
    var r = n % 7
    var ansIdx = (w - 1 + n) % 7
    var ans = '星期' + WEEK[ansIdx]
    var today = '星期' + WEEK[w - 1]
    var days = []
    for (var i = 1; i <= r; i++) {
      days.push('星期' + WEEK[(w - 1 + i) % 7])
    }
    return {
      topic: 'yushu1',
      variant: 'week',
      stem: '今天是' + today + '。再过 ' + n + ' 天是星期几？',
      answer: ans,
      unit: '',
      ansLabel: '答：再过 ' + n + ' 天是',
      ansSuffix: '。',
      workLabel: '规律',
      solution: [
        { tag: '想一想', text: '一个星期 7 天，7 天一个循环——过整整一个星期，还是' + today + '。' },
        {
          tag: '列算式',
          text: n + ' ÷ 7 = ' + q + '（周）' + (r === 0 ? '，正好过了 ' + q + ' 整周，一天不多。' : '……' + r + '（天）。过 ' + q + ' 整周还是' + today + '，再往后数 ' + r + ' 天。')
        },
        {
          tag: '数一数',
          text: r === 0 ? '不用再数，还是' + today + '。' : '从' + today + '往后：' + days.join('、') + '。'
        },
        { tag: '验一验', text: q + ' × 7 ' + (r === 0 ? '= ' : '+ ' + r + ' = ') + n + '（天），周数和零头都对上了 ✓' },
        { tag: '答', text: '再过 ' + n + ' 天是' + ans + '。' }
      ],
      key: 'week:' + w + ',' + n
    }
  }

  var YUSHU1 = {
    id: 'yushu1',
    no: '27',
    stage: 'L2',
    name: '余数的应用（一）',
    lesson: {
      title: '余数的应用（一） · 方法讲解',
      sections: [
        {
          heading: '这是什么问题？',
          paras: ['平均分东西，分不完剩下的就是「余数」。很多好玩的问题——排队形、涂颜色、算星期——答案都藏在余数里。']
        },
        {
          heading: '怎么想？',
          paras: [
            '先用除法算出「几组……余几」：总数 ÷ 每组几个 = 几组……余几个。',
            '真正决定答案的往往是余数：余几，第 N 个就是新一组里的第几个；余 0，正好是一组的最后一个。'
          ]
        },
        {
          heading: '例题示范',
          example: {
            stem: '按 红、黄、蓝、红、黄、蓝……的顺序一直排下去，第 14 个是什么颜色？',
            solution: [
              { tag: '想一想', text: '红、黄、蓝 3 个一组，一组一组重复。' },
              { tag: '列算式', text: '14 ÷ 3 = 4（组）……2（个）。' },
              { tag: '找位置', text: '余 2，第 14 个就是新一组里的第 2 个：黄。' },
              { tag: '验一验', text: '4 组用了 12 个，第 13 个是红、第 14 个是黄 ✓' },
              { tag: '答', text: '第 14 个是黄色。' }
            ]
          }
        },
        { heading: '记住口诀', chant: '周期问题看余数，余几就是第几个；要是正好没余数，就是一组最后一个。' }
      ]
    },
    variants: [
      { id: 'divide', setting: 'vYs1Divide', label: '带余分组（几袋、剩几个）', gen: genDivide },
      { id: 'cycle', setting: 'vYs1Cycle', label: '周期问题（第 N 个是什么）', gen: genCycle },
      { id: 'week', setting: 'vYs1Week', label: '星期问题（再过 n 天）', def: false, gen: genWeek }
    ],
    generate: function (s) {
      return U.generateFrom(YUSHU1.variants, s)
    },
    titleFor: function (s) {
      return '余数的应用（一）练习 · ' + U.DIFF_LABEL[s.difficulty]
    }
  }

  root.SumSum.aoshu.topics.yushu1 = YUSHU1
  root.SumSum.aoshu.topicList.push(YUSHU1)
})(typeof window !== 'undefined' ? window : globalThis)
