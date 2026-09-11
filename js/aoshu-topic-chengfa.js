/**
 * 知识点「24 乘法的意义与性质」（L2）：乘法是相同加数的简便写法。
 * 变式：①加法改乘法 ②不用算比大小（同因数比另一个/乘法对加法）③拆数巧算（默认关）。
 * 因数全部在九九口诀表范围内，反向构造。
 */
(function (root) {
  'use strict'

  var U = root.SumSum.aoshu.util

  /* 各难度档的因数范围 */
  var RANGE = {
    L1: { fMin: 2, fMax: 5 },
    L2: { fMin: 2, fMax: 9 },
    L3: { fMin: 2, fMax: 9 }
  }

  function range(s) {
    return RANGE[s.difficulty] || RANGE.L1
  }

  /* 变式①「加法改乘法」：n 个 a 连加，改写成乘法并求结果 */
  function genMean(s) {
    var r = range(s)
    var a = U.randInt(r.fMin, r.fMax)
    var n = U.randInt(3, s.difficulty === 'L3' ? 6 : 5)
    var terms = []
    for (var i = 0; i < n; i++) terms.push(a)
    var sumSteps = []
    var acc = a
    for (var j = 1; j < n; j++) {
      sumSteps.push(acc + ' + ' + a + ' = ' + (acc + a))
      acc += a
    }
    return {
      topic: 'chengfa',
      variant: 'mean',
      stem: '把 ' + terms.join(' + ') + ' 改写成乘法算式，算一算结果是多少？',
      answer: a * n,
      unit: '',
      ansLabel: '答：结果是',
      ansSuffix: '。',
      workLabel: '乘法算式',
      solution: [
        { tag: '想一想', text: '加号连着的都是同一个数 ' + a + '，数一数：一共有 ' + n + ' 个 ' + a + ' 相加。' },
        { tag: '列算式', text: n + ' 个 ' + a + '，写成乘法就是 ' + a + ' × ' + n + ' = ' + a * n + '（写成 ' + n + ' × ' + a + ' 也对）。' },
        { tag: '验一验', text: '连加检查：' + sumSteps.join('，') + '，和乘法算的一样 ✓' },
        { tag: '答', text: terms.join(' + ') + ' = ' + a + ' × ' + n + ' = ' + a * n + '。' }
      ],
      key: 'mean:' + a + ',' + n
    }
  }

  function signOf(l, r) {
    return l > r ? '>' : l < r ? '<' : '='
  }

  /* 变式②「不用算比大小」：同因数比另一个因数 / 乘法对加法 */
  function genCompare(s) {
    var r = range(s)
    if (Math.random() < 0.55) {
      /* 形态 a：a×b1 ○ a×b2，同因数只比另一个 */
      var a = U.randInt(r.fMin, r.fMax)
      var b1 = U.randInt(r.fMin, r.fMax)
      var b2 = U.randInt(r.fMin, r.fMax)
      if (b1 === b2) return null
      var sign = signOf(a * b1, a * b2)
      var word = b1 > b2 ? '大' : '小'
      return {
        topic: 'chengfa',
        variant: 'compare',
        stem: '在 ○ 里填上「>」「<」或「=」：' + a + ' × ' + b1 + ' ○ ' + a + ' × ' + b2,
        answer: sign,
        unit: '',
        ansLabel: '答：○ 里填',
        ansSuffix: '。',
        workLabel: '算一算',
        solution: [
          { tag: '想一想', text: '两边都是 ' + a + ' 乘一个数——相同的 ' + a + ' 不用管，只比另一个数就行。' },
          { tag: '比一比', text: b1 + ' 比 ' + b2 + ' ' + word + '，' + b1 + ' 个 ' + a + ' 当然比 ' + b2 + ' 个 ' + a + ' ' + (b1 > b2 ? '多' : '少') + '，所以左边' + word + '。' },
          { tag: '验一验', text: '真算一遍：' + a + ' × ' + b1 + ' = ' + a * b1 + '，' + a + ' × ' + b2 + ' = ' + a * b2 + '，' + a * b1 + ' ' + sign + ' ' + a * b2 + ' ✓' },
          { tag: '答', text: '○ 里填「' + sign + '」。' }
        ],
        key: 'cmp:a:' + a + ',' + b1 + ',' + b2
      }
    }
    /*
     * 形态 b：a×b ○ a+b，乘法是好几个相加。
     * 因数都 ≥2 时乘积必然更大，答案会清一色是「>」，孩子全填 > 就能蒙对
     * （实测占到七成）。这里先定答案再造数：带 1 的乘法反而更小，是最能
     * 检验「乘法到底是几个几」的一档，(2,2) 则是唯一相等的情形。
     */
    var want = Math.random()
    var x, y
    if (want < 0.1) {
      x = 2
      y = 2 // 2 × 2 = 2 + 2，唯一相等的一组
    } else if (want < 0.5) {
      /* 一个因数取 1：1 个 y 就是 y，而 1 + y 还多 1，左边反而小 */
      if (Math.random() < 0.5) {
        x = 1
        y = U.randInt(Math.max(2, r.fMin), r.fMax)
      } else {
        x = U.randInt(Math.max(2, r.fMin), r.fMax)
        y = 1
      }
    } else {
      x = U.randInt(Math.max(2, r.fMin), r.fMax)
      y = U.randInt(Math.max(2, r.fMin), r.fMax)
      if (x === 2 && y === 2) y = 3 // 避开相等的情形，留给上面那一档
    }
    var sign2 = signOf(x * y, x + y)
    var reason
    if (sign2 === '=') {
      reason = x + ' × ' + y + ' 正好就是 ' + x + ' + ' + y + '（2 个 2 相加），两边一样多。'
    } else if (sign2 === '<') {
      var one = x === 1 ? y : x // 另一个因数
      reason =
        x + ' × ' + y + ' 只有 1 个 ' + one + '，就是 ' + one + '；' +
        x + ' + ' + y + ' 在 ' + one + ' 上又多加了 1，所以左边小。'
    } else {
      reason = x + ' × ' + y + ' 是 ' + y + ' 个 ' + x + ' 相加，' + x + ' + ' + y + ' 只加了一次，' + y + ' 个 ' + x + ' 多得多，左边大。'
    }
    return {
      topic: 'chengfa',
      variant: 'compare',
      stem: '在 ○ 里填上「>」「<」或「=」：' + x + ' × ' + y + ' ○ ' + x + ' + ' + y,
      answer: sign2,
      unit: '',
      ansLabel: '答：○ 里填',
      ansSuffix: '。',
      workLabel: '算一算',
      solution: [
        { tag: '想一想', text: '左边是乘法、右边是加法，先想想它们各是「几个几」。' },
        { tag: '比一比', text: reason },
        { tag: '验一验', text: '真算一遍：' + x + ' × ' + y + ' = ' + x * y + '，' + x + ' + ' + y + ' = ' + (x + y) + '，' + x * y + ' ' + sign2 + ' ' + (x + y) + ' ✓' },
        { tag: '答', text: '○ 里填「' + sign2 + '」。' }
      ],
      key: 'cmp:b:' + x + ',' + y
    }
  }

  /* 变式③「拆数巧算」：a × b = a × b1 + a × □，□ = b − b1 */
  function genSplit(s) {
    var r = range(s)
    var a = U.randInt(r.fMin, r.fMax)
    var b = U.randInt(4, r.fMax)
    if (b < 4) return null
    var b1 = U.randInt(1, b - 1)
    var b2 = b - b1
    return {
      topic: 'chengfa',
      variant: 'split',
      stem: '在 □ 里填几，等式才成立？　' + a + ' × ' + b + ' = ' + a + ' × ' + b1 + ' + ' + a + ' × □',
      answer: b2,
      unit: '',
      ansLabel: '答：□ 里填',
      ansSuffix: '。',
      workLabel: '想法',
      solution: [
        { tag: '想一想', text: '左边是 ' + b + ' 个 ' + a + '；右边先拿出 ' + b1 + ' 个 ' + a + '，剩下的要用 □ 个 ' + a + ' 补上。' },
        { tag: '列算式', text: b + ' 个减去 ' + b1 + ' 个：' + b + ' − ' + b1 + ' = ' + b2 + '，还差 ' + b2 + ' 个 ' + a + '。' },
        { tag: '验一验', text: a + ' × ' + b1 + ' = ' + a * b1 + '，' + a + ' × ' + b2 + ' = ' + a * b2 + '，' + a * b1 + ' + ' + a * b2 + ' = ' + a * b + '；左边 ' + a + ' × ' + b + ' = ' + a * b + '，两边一样 ✓' },
        { tag: '答', text: '□ 里填 ' + b2 + '。' }
      ],
      key: 'split:' + a + ',' + b + ',' + b1
    }
  }

  var CHENGFA = {
    id: 'chengfa',
    no: '24',
    stage: 'L2',
    name: '乘法的意义与性质',
    lesson: {
      title: '乘法的意义 · 方法讲解',
      sections: [
        {
          heading: '这是什么问题？',
          paras: ['好几个相同的数连加，写起来又长又容易错。乘法就是它的简便写法：4 个 3 相加，写成 3 × 4——乘号读作「乘」，念起来就是「3 乘 4」。']
        },
        {
          heading: '怎么想？',
          paras: [
            '看到连加先数一数：加数是不是都一样？一共有几个？「几个几」数清楚，乘法算式就出来了。',
            '比较两个乘法算式时，先看有没有相同的因数——有相同的，只比另一个数就行，根本不用算出来。'
          ]
        },
        {
          heading: '例题示范',
          example: {
            stem: '把 5 + 5 + 5 改写成乘法算式，算一算结果是多少？',
            solution: [
              { tag: '想一想', text: '加数都是 5，一共 3 个 5 相加。' },
              { tag: '列算式', text: '3 个 5，写成乘法就是 5 × 3 = 15。' },
              { tag: '验一验', text: '连加检查：5 + 5 = 10，10 + 5 = 15，一样 ✓' },
              { tag: '答', text: '5 + 5 + 5 = 5 × 3 = 15。' }
            ]
          }
        },
        { heading: '记住口诀', chant: '相同加数数一数，几个几就几乘几。' }
      ]
    },
    variants: [
      { id: 'mean', setting: 'vCfMean', label: '加法改乘法', gen: genMean },
      { id: 'compare', setting: 'vCfCompare', label: '不用算比大小', gen: genCompare },
      { id: 'split', setting: 'vCfSplit', label: '拆数巧算（几个几分开算）', def: false, gen: genSplit }
    ],
    generate: function (s) {
      return U.generateFrom(CHENGFA.variants, s)
    },
    titleFor: function (s) {
      return '乘法意义与性质练习 · ' + U.DIFF_LABEL[s.difficulty]
    }
  }

  root.SumSum.aoshu.topics.chengfa = CHENGFA
  root.SumSum.aoshu.topicList.push(CHENGFA)
})(typeof window !== 'undefined' ? window : globalThis)
