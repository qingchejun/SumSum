/**
 * 知识点「28 余数的应用（二）」：进一法与去尾法。
 * 同样是有余数，处理方式相反——关键看问题问什么：
 * 人人都要有位置 → 剩下的也要算一份（进一）；剩下的不够一份 → 舍去（去尾）。
 * 变式：①至少要几个（进一法）②最多能几个（去尾法）③求被除数（逆运算）。
 */
(function (root) {
  'use strict'

  var U = root.SumSum.aoshu.util

  /* 各难度档：除数与商的范围（乘法口诀内），总数随之受控 */
  var CAP = {
    L1: { k: 5, g: 5 },
    L2: { k: 9, g: 9 },
    L3: { k: 9, g: 9 }
  }

  function cap(s) {
    return CAP[s.difficulty] || CAP.L1
  }

  /* 进一法场景：unitWord 是「船/车…」的量词短语，objUnit 是被装载对象的量词 */
  var CEIL_SCENES = [
    {
      make: function (k, t) {
        return '每条船最多坐 ' + k + ' 人，' + t + ' 个小朋友去划船，至少要租几条船？'
      },
      unit: '条', thing: '船', obj: '人', verb: '坐'
    },
    {
      make: function (k, t) {
        return '每辆车最多坐 ' + k + ' 人，' + t + ' 个同学去春游，至少要几辆车？'
      },
      unit: '辆', thing: '车', obj: '人', verb: '坐'
    },
    {
      make: function (k, t) {
        return '每个盒子最多装 ' + k + ' 个乒乓球，' + t + ' 个乒乓球至少要几个盒子？'
      },
      unit: '个', thing: '盒子', obj: '个', verb: '装'
    }
  ]

  /* 变式①进一法：t = k×g + r（r≥1），剩下的也要占一份，答案 g+1 */
  function genCeil(s) {
    var c = cap(s)
    var k = U.randInt(2, c.k)
    var g = U.randInt(2, c.g)
    var r = U.randInt(1, k - 1)
    var t = k * g + r
    var sc = U.pick(CEIL_SCENES)
    return {
      topic: 'yushu2',
      variant: 'ceil',
      stem: sc.make(k, t),
      answer: g + 1,
      unit: sc.unit,
      ansLabel: '答：至少要',
      ansSuffix: sc.unit + sc.thing + '。',
      solution: [
        { tag: '列算式', text: t + ' ÷ ' + k + ' = ' + g + '（' + sc.unit + '）……' + r + '（' + sc.obj + '）。' },
        { tag: '小心陷阱', text: '剩下的 ' + r + ' ' + sc.obj + '也要' + sc.verb + '，不能丢下——得再加 1 ' + sc.unit + '：' + g + ' + 1 = ' + (g + 1) + '（' + sc.unit + '）。' },
        { tag: '验一验', text: (g + 1) + ' ' + sc.unit + sc.thing + '最多' + sc.verb + ' ' + (g + 1) + ' × ' + k + ' = ' + (g + 1) * k + ' ' + sc.obj + '，够了 ✓；只要 ' + g + ' ' + sc.unit + '最多' + sc.verb + ' ' + g * k + ' ' + sc.obj + '，不够 ' + t + ' ' + sc.obj + '。' },
        { tag: '答', text: '至少要 ' + (g + 1) + ' ' + sc.unit + sc.thing + '。' }
      ],
      key: 'ceil:' + sc.thing + ':' + t + ',' + k
    }
  }

  /* 去尾法场景 */
  var FLOOR_SCENES = [
    {
      make: function (k, t, name) {
        return '一支铅笔 ' + k + ' 元，' + name + '有 ' + t + ' 元，最多能买几支铅笔？'
      },
      unit: '支', thing: '铅笔', money: true
    },
    {
      make: function (k, t) {
        return '一根绳子长 ' + t + ' 米，每 ' + k + ' 米剪一段做跳绳，最多能剪几段？'
      },
      unit: '段', thing: '跳绳', money: false, obj: '米'
    },
    {
      make: function (k, t) {
        return '每 ' + k + ' 个草莓串一串，' + t + ' 个草莓最多能串几串？'
      },
      unit: '串', thing: '', money: false, obj: '个'
    }
  ]

  /* 变式②去尾法：剩下的不够一份，舍去，答案 g */
  function genFloor(s) {
    var c = cap(s)
    var k = U.randInt(2, c.k)
    var g = U.randInt(2, c.g)
    var r = U.randInt(1, k - 1)
    var t = k * g + r
    var sc = U.pick(FLOOR_SCENES)
    var name = U.pick(U.NAMES)
    var leftWord = sc.money ? '元' : sc.obj
    return {
      topic: 'yushu2',
      variant: 'floor',
      stem: sc.make(k, t, name),
      answer: g,
      unit: sc.unit,
      ansLabel: '答：最多能' + (sc.money ? '买' : sc.unit === '段' ? '剪' : '串'),
      ansSuffix: sc.unit + (sc.thing || '') + '。',
      solution: [
        { tag: '列算式', text: t + ' ÷ ' + k + ' = ' + g + '（' + sc.unit + '）……' + r + '（' + leftWord + '）。' },
        { tag: '小心陷阱', text: '剩下的 ' + r + ' ' + leftWord + '不够再来一' + sc.unit + '，只能舍去——不能加一！' },
        { tag: '验一验', text: g + ' ' + sc.unit + '要用 ' + g + ' × ' + k + ' = ' + g * k + ' ' + leftWord + '；再多一' + sc.unit + '就要 ' + (g + 1) * k + ' ' + leftWord + '，超过 ' + t + ' 了，不行 ✓' },
        { tag: '答', text: '最多能' + (sc.money ? '买' : '') + ' ' + g + ' ' + sc.unit + (sc.thing || '') + '。' }
      ],
      key: 'floor:' + sc.unit + ':' + t + ',' + k
    }
  }

  /* 变式③求被除数：被除数 = 除数×商 + 余数 */
  function genFind(s) {
    var c = cap(s)
    var k = U.randInt(2, c.k)
    var g = U.randInt(2, c.g)
    var r = U.randInt(1, k - 1)
    var t = k * g + r
    return {
      topic: 'yushu2',
      variant: 'find',
      stem: '一个数除以 ' + k + '，商是 ' + g + '，余数是 ' + r + '。这个数是几？',
      answer: t,
      unit: '',
      ansLabel: '答：这个数是',
      ansSuffix: '。',
      solution: [
        { tag: '想一想', text: '倒着想：这个数分成了 ' + g + ' 份（每份 ' + k + '），还多 ' + r + '——被除数 = 除数 × 商 + 余数。' },
        { tag: '列算式', text: k + ' × ' + g + ' = ' + k * g + '，' + k * g + ' + ' + r + ' = ' + t + '。' },
        { tag: '验一验', text: t + ' ÷ ' + k + ' = ' + g + '……' + r + '，商和余数都对上了 ✓' },
        { tag: '答', text: '这个数是 ' + t + '。' }
      ],
      key: 'find:' + k + ',' + g + ',' + r
    }
  }

  var YUSHU2 = {
    id: 'yushu2',
    no: '28',
    stage: 'L2',
    name: '余数的应用（二）',
    lesson: {
      title: '余数的应用（二） · 方法讲解',
      sections: [
        {
          heading: '这是什么问题？',
          paras: ['除法算完有余数，答案却不一定是商——有时要加 1（进一法），有时要把余数扔掉（去尾法）。同样的余数，两种处理，全看问题问什么。']
        },
        {
          heading: '怎么想？',
          paras: [
            '进一法：坐船、装箱这类「人人都要有位置」的问题，剩下的也要占一份，商要加 1。',
            '去尾法：买东西、剪绳子这类「不够一份就作罢」的问题，剩下的凑不成一份，舍去不算。'
          ]
        },
        {
          heading: '例题示范',
          example: {
            stem: '每条船最多坐 4 人，18 个小朋友去划船，至少要租几条船？',
            solution: [
              { tag: '列算式', text: '18 ÷ 4 = 4（条）……2（人）。' },
              { tag: '小心陷阱', text: '剩下的 2 人也要过河，不能丢下——4 + 1 = 5（条）。' },
              { tag: '验一验', text: '5 条船最多坐 20 人，够了 ✓；4 条只能坐 16 人，不够。' },
              { tag: '答', text: '至少要租 5 条船。' }
            ]
          }
        },
        { heading: '记住口诀', chant: '同是余数两样看：不能落下就进一，不够一份就去尾。' }
      ]
    },
    variants: [
      { id: 'ceil', setting: 'vYs2Ceil', label: '至少要几个（进一法）', gen: genCeil },
      { id: 'floor', setting: 'vYs2Floor', label: '最多能几个（去尾法）', gen: genFloor },
      { id: 'find', setting: 'vYs2Find', label: '求被除数（倒着算）', def: false, gen: genFind }
    ],
    generate: function (s) {
      return U.generateFrom(YUSHU2.variants, s)
    },
    titleFor: function (s) {
      return '余数的应用（二）练习 · ' + U.DIFF_LABEL[s.difficulty]
    }
  }

  root.SumSum.aoshu.topics.yushu2 = YUSHU2
  root.SumSum.aoshu.topicList.push(YUSHU2)
})(typeof window !== 'undefined' ? window : globalThis)
