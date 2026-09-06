/**
 * 知识点「26 四则混合运算」（L2）：运算顺序——先乘除后加减，有括号先算括号。
 * 变式：①先乘除后加减 ②括号优先 ③同数不同序比大小（默认关）。
 * 解析里的「小心陷阱」步骤会把按错误顺序算出的值真算出来，让孩子看到差别。
 */
(function (root) {
  'use strict'

  var U = root.SumSum.aoshu.util

  /* 各难度档：因数范围与结果上限 */
  var RANGE = {
    L1: { fMin: 2, fMax: 5, cap: 30 },
    L2: { fMin: 2, fMax: 9, cap: 60 },
    L3: { fMin: 2, fMax: 9, cap: 100 }
  }

  function range(s) {
    return RANGE[s.difficulty] || RANGE.L1
  }

  /* 变式①「先乘除后加减」：a + b×c 或 a − b×c */
  function genOrder(s) {
    var r = range(s)
    var b = U.randInt(r.fMin, r.fMax)
    var c = U.randInt(r.fMin, r.fMax)
    var p = b * c
    if (Math.random() < 0.5) {
      /* 加法形态 */
      if (r.cap - p < 2) return null
      var a = U.randInt(2, r.cap - p)
      var wrong = (a + b) * c
      return {
        topic: 'size',
        variant: 'order',
        stem: '算一算：' + a + ' + ' + b + ' × ' + c,
        answer: a + p,
        unit: '',
        ansLabel: '答：' + a + ' + ' + b + ' × ' + c + ' =',
        ansSuffix: '。',
        solution: [
          { tag: '想一想', text: '算式里有加也有乘——先乘除，后加减，先算 ' + b + ' × ' + c + '。' },
          { tag: '第 1 步', text: b + ' × ' + c + ' = ' + p + '。' },
          { tag: '第 2 步', text: a + ' + ' + p + ' = ' + (a + p) + '。' },
          { tag: '小心陷阱', text: '要是从左往右先算 ' + a + ' + ' + b + ' = ' + (a + b) + '，再乘 ' + c + ' 就成了 ' + wrong + '——顺序错，答案就错。' },
          { tag: '答', text: a + ' + ' + b + ' × ' + c + ' = ' + (a + p) + '。' }
        ],
        key: 'order:add:' + a + ',' + b + ',' + c
      }
    }
    /* 减法形态：a − b×c，保证结果 ≥ 1 */
    if (p + 1 > r.cap) return null
    var a2 = U.randInt(p + 1, r.cap)
    var wrongText =
      a2 - b >= 0
        ? '要是从左往右先算 ' + a2 + ' − ' + b + ' = ' + (a2 - b) + '，再乘 ' + c + ' 就成了 ' + (a2 - b) * c + '——顺序错，答案就错。'
        : '要是从左往右算就乱套了——乘法必须先算。'
    return {
      topic: 'size',
      variant: 'order',
      stem: '算一算：' + a2 + ' − ' + b + ' × ' + c,
      answer: a2 - p,
      unit: '',
      ansLabel: '答：' + a2 + ' − ' + b + ' × ' + c + ' =',
      ansSuffix: '。',
      solution: [
        { tag: '想一想', text: '算式里有减也有乘——先乘除，后加减，先算 ' + b + ' × ' + c + '。' },
        { tag: '第 1 步', text: b + ' × ' + c + ' = ' + p + '。' },
        { tag: '第 2 步', text: a2 + ' − ' + p + ' = ' + (a2 - p) + '。' },
        { tag: '小心陷阱', text: wrongText },
        { tag: '答', text: a2 + ' − ' + b + ' × ' + c + ' = ' + (a2 - p) + '。' }
      ],
      key: 'order:sub:' + a2 + ',' + b + ',' + c
    }
  }

  /* 变式②「括号优先」：(a + b) × c 或 (a − b) × c，括号内和/差控制在口诀表内 */
  function genParen(s) {
    var r = range(s)
    var c = U.randInt(r.fMin, r.fMax)
    if (Math.random() < 0.5) {
      var a = U.randInt(1, 8)
      var b = U.randInt(1, 9 - a) // a + b ≤ 9，乘法仍在口诀表内
      var sum = a + b
      if (sum * c > r.cap) return null
      var wrong = a + b * c
      return {
        topic: 'size',
        variant: 'paren',
        stem: '算一算：(' + a + ' + ' + b + ') × ' + c,
        answer: sum * c,
        unit: '',
        ansLabel: '答：(' + a + ' + ' + b + ') × ' + c + ' =',
        ansSuffix: '。',
        solution: [
          { tag: '想一想', text: '有括号，括号里的最先算。' },
          { tag: '第 1 步', text: a + ' + ' + b + ' = ' + sum + '。' },
          { tag: '第 2 步', text: sum + ' × ' + c + ' = ' + sum * c + '。' },
          { tag: '小心陷阱', text: '要是不看括号先算 ' + b + ' × ' + c + ' = ' + b * c + '，再加 ' + a + ' 就成了 ' + wrong + '——括号必须最先算。' },
          { tag: '答', text: '(' + a + ' + ' + b + ') × ' + c + ' = ' + sum * c + '。' }
        ],
        key: 'paren:add:' + a + ',' + b + ',' + c
      }
    }
    var x = U.randInt(3, 9)
    var y = U.randInt(1, x - 2) // x − y ≥ 2
    var d = x - y
    if (d * c > r.cap) return null
    var wrong2 = x - y * c
    var wrongText2 =
      wrong2 >= 0
        ? '要是不看括号先算 ' + y + ' × ' + c + ' = ' + y * c + '，' + x + ' − ' + y * c + ' 就成了 ' + wrong2 + '——括号必须最先算。'
        : '要是不看括号先算 ' + y + ' × ' + c + ' = ' + y * c + '，' + x + ' 根本不够减，就卡住了——括号必须最先算。'
    return {
      topic: 'size',
      variant: 'paren',
      stem: '算一算：(' + x + ' − ' + y + ') × ' + c,
      answer: d * c,
      unit: '',
      ansLabel: '答：(' + x + ' − ' + y + ') × ' + c + ' =',
      ansSuffix: '。',
      solution: [
        { tag: '想一想', text: '有括号，括号里的最先算。' },
        { tag: '第 1 步', text: x + ' − ' + y + ' = ' + d + '。' },
        { tag: '第 2 步', text: d + ' × ' + c + ' = ' + d * c + '。' },
        { tag: '小心陷阱', text: wrongText2 },
        { tag: '答', text: '(' + x + ' − ' + y + ') × ' + c + ' = ' + d * c + '。' }
      ],
      key: 'paren:sub:' + x + ',' + y + ',' + c
    }
  }

  /* 变式③「同数不同序」：a + b × c ○ (a + b) × c，两边分别按顺序算再比。
     右边 − 左边 = a × (c − 1) > 0 恒成立，靠随机换边让答案在 > 和 < 之间变化 */
  function genCompare(s) {
    var r = range(s)
    var c = U.randInt(2, r.fMax)
    var a = U.randInt(1, 8)
    var b = U.randInt(1, 9 - a)
    var plain = a + b * c
    var paren = (a + b) * c
    if (paren > r.cap) return null
    if (plain === paren) return null // 理论上不会发生（a ≥ 1、c ≥ 2），防御一层
    var plainText = a + ' + ' + b + ' × ' + c
    var parenText = '(' + a + ' + ' + b + ') × ' + c
    var parenLeft = Math.random() < 0.5
    var lText = parenLeft ? parenText : plainText
    var rText = parenLeft ? plainText : parenText
    var lVal = parenLeft ? paren : plain
    var rVal = parenLeft ? plain : paren
    var sign = lVal > rVal ? '>' : '<'
    return {
      topic: 'size',
      variant: 'compare',
      stem: '在 ○ 里填上「>」或「<」：' + lText + ' ○ ' + rText,
      answer: sign,
      unit: '',
      ansLabel: '答：○ 里填',
      ansSuffix: '。',
      workLabel: '算一算',
      solution: [
        { tag: '想一想', text: '两边数字一模一样，只差一个括号——分别按运算顺序算出来再比。' },
        { tag: '第 1 步', text: '左边 ' + lText + '：' + (parenLeft ? a + ' + ' + b + ' = ' + (a + b) + '，' + (a + b) + ' × ' + c + ' = ' + lVal : b + ' × ' + c + ' = ' + b * c + '，' + a + ' + ' + b * c + ' = ' + lVal) + '。' },
        { tag: '第 2 步', text: '右边 ' + rText + '：' + (parenLeft ? b + ' × ' + c + ' = ' + b * c + '，' + a + ' + ' + b * c + ' = ' + rVal : a + ' + ' + b + ' = ' + (a + b) + '，' + (a + b) + ' × ' + c + ' = ' + rVal) + '。' },
        { tag: '比一比', text: lVal + ' ' + sign + ' ' + rVal + '——带括号的那边把 ' + a + ' 也翻了倍，所以更大。' },
        { tag: '答', text: '○ 里填「' + sign + '」。' }
      ],
      key: 'cmp:' + a + ',' + b + ',' + c + ',' + (parenLeft ? 'pl' : 'pr')
    }
  }

  var SIZE = {
    id: 'size',
    no: '26',
    stage: 'L2',
    name: '四则混合运算',
    lesson: {
      title: '四则混合运算 · 方法讲解',
      sections: [
        {
          heading: '这是什么问题？',
          paras: ['一道算式里又有加减又有乘除，先算谁？顺序错了，每一步都算对，答案也是错的。']
        },
        {
          heading: '怎么想？',
          paras: [
            '规则只有两条：有括号，先算括号里的；没有括号，先乘除、后加减。',
            '动笔前先圈出要先算的那一步，算完把结果抄下来，再算第二步——一步一步来，不跳步。'
          ]
        },
        {
          heading: '例题示范',
          example: {
            stem: '算一算：2 + 3 × 4',
            solution: [
              { tag: '想一想', text: '有加有乘，先算乘法 3 × 4。' },
              { tag: '第 1 步', text: '3 × 4 = 12。' },
              { tag: '第 2 步', text: '2 + 12 = 14。' },
              { tag: '小心陷阱', text: '从左往右算 2 + 3 = 5、5 × 4 = 20 就错了——乘法要先算。' },
              { tag: '答', text: '2 + 3 × 4 = 14。' }
            ]
          }
        },
        { heading: '记住口诀', chant: '括号最优先，乘除排第二，加减最后算。' }
      ]
    },
    variants: [
      { id: 'order', setting: 'vSzOrder', label: '先乘除后加减', gen: genOrder },
      { id: 'paren', setting: 'vSzParen', label: '括号优先', gen: genParen },
      { id: 'compare', setting: 'vSzCompare', label: '同数不同序比大小', def: false, gen: genCompare }
    ],
    generate: function (s) {
      return U.generateFrom(SIZE.variants, s)
    },
    titleFor: function (s) {
      return '四则混合运算练习 · ' + U.DIFF_LABEL[s.difficulty]
    }
  }

  root.SumSum.aoshu.topics.size = SIZE
  root.SumSum.aoshu.topicList.push(SIZE)
})(typeof window !== 'undefined' ? window : globalThis)
