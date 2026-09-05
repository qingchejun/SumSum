/**
 * 知识点「01 数的大小比较」：比数、比算式，重点是「不用算的巧比」。
 * 变式：①两数比大小 ②算式与数比（先算再比）③巧比（两边有相同部分，盖住只比不同的）。
 */
(function (root) {
  'use strict'

  var U = root.SumSum.aoshu.util

  var LEN_NAME = { 1: '一位数', 2: '两位数', 3: '三位数' }

  function symOf(x, y) {
    return x > y ? '>' : x < y ? '<' : '='
  }

  function flip(sym) {
    return sym === '>' ? '<' : sym === '<' ? '>' : '='
  }

  /* 两个数怎么比的说理文字（只用题面给出的数，不引用答案之外的信息） */
  function compareText(a, b) {
    if (a === b) return a + ' 和 ' + b + ' 每一位都相同，一样大。'
    var big = Math.max(a, b)
    var small = Math.min(a, b)
    var lb = String(big).length
    var ls = String(small).length
    if (lb !== ls) {
      return big + ' 是' + LEN_NAME[lb] + '，' + small + ' 是' + LEN_NAME[ls] + '——位数多的大，所以 ' + big + ' 大。'
    }
    if (lb === 1) return '都是一位数，直接比：' + big + ' 比 ' + small + ' 大。'
    var tb = Math.floor(big / 10)
    var ts = Math.floor(small / 10)
    if (tb !== ts) {
      return '都是两位数，先比十位：' + big + ' 的十位是 ' + tb + '，' + small + ' 的十位是 ' + ts + '，' + tb + ' 大，所以 ' + big + ' 大。'
    }
    return '十位一样（都是 ' + tb + '），再比个位：' + big % 10 + ' 比 ' + small % 10 + ' 大，所以 ' + big + ' 大。'
  }

  /* 变式①两数比大小 */
  function genNum(s) {
    var cap = U.diff(s).numMax
    var a = U.randInt(1, cap)
    var b = Math.random() < 0.15 ? a : U.randInt(1, cap)
    var sym = symOf(a, b)
    var check =
      sym === '='
        ? '两个数一模一样，怎么比都一样大 ✓'
        : '换个方向再比一遍：' + b + ' ○ ' + a + ' 该填「' + flip(sym) + '」，方向一换符号正好相反 ✓'
    return {
      topic: 'daxiao',
      variant: 'num',
      stem: '在 ○ 里填上「>」「<」或「=」：' + a + ' ○ ' + b,
      answer: sym,
      unit: '',
      ansLabel: '答：○ 里填',
      ansSuffix: '。',
      workLabel: '比一比',
      solution: [
        { tag: '想一想', text: '比大小先看位数，位数多的大；位数一样，就从十位比起，十位一样再比个位。' },
        { tag: '比一比', text: compareText(a, b) },
        { tag: '验一验', text: check },
        { tag: '答', text: a + ' ' + sym + ' ' + b + '，○ 里填「' + sym + '」。' }
      ],
      key: 'num:' + a + ',' + b
    }
  }

  /* 变式②算式与数比：先算左边再比 */
  function genExpr(s) {
    var cap = U.diff(s).numMax
    var plus = Math.random() < 0.5
    var x, y, left
    if (plus) {
      x = U.randInt(1, cap - 1)
      y = U.randInt(1, cap - x)
      left = x + y
    } else {
      x = U.randInt(2, cap)
      y = U.randInt(1, x - 1)
      left = x - y
    }
    var r
    if (Math.random() < 0.15) {
      r = left
    } else {
      var delta = U.randInt(1, 5)
      r = Math.random() < 0.5 ? left + delta : left - delta
      if (r < 1) r = left + delta
      if (r > cap) r = left - delta
      if (r === left || r < 1) return null
    }
    var op = plus ? ' + ' : ' − '
    var expr = x + op + y
    var sym = symOf(left, r)
    var back = plus
      ? left + ' − ' + y + ' = ' + x + '，左边算得没错 ✓'
      : left + ' + ' + y + ' = ' + x + '，左边算得没错 ✓'
    return {
      topic: 'daxiao',
      variant: 'expr',
      stem: '在 ○ 里填上「>」「<」或「=」：' + expr + ' ○ ' + r,
      answer: sym,
      unit: '',
      ansLabel: '答：○ 里填',
      ansSuffix: '。',
      workLabel: '比一比',
      solution: [
        { tag: '想一想', text: '左边是算式，先把左边算出来，再和右边的数比。' },
        { tag: '第 1 步', text: '先算左边：' + expr + ' = ' + left + '。' },
        { tag: '比一比', text: sym === '=' ? left + ' 和 ' + r + ' 正好相等。' : left + ' ' + sym + ' ' + r + '。' },
        { tag: '验一验', text: back },
        { tag: '答', text: expr + ' ' + sym + ' ' + r + '，○ 里填「' + sym + '」。' }
      ],
      key: 'expr:' + (plus ? '+' : '-') + ':' + x + ',' + y + ',' + r
    }
  }

  /* 变式③巧比：两边只有一个数不同，盖住相同的部分直接比 */
  function genSmart(s) {
    var cap = U.diff(s).numMax
    var shape = U.pick(['add', 'sub1', 'sub2'])
    var c, p, q, exprL, exprR, left, right, think
    if (shape === 'add') {
      c = U.randInt(2, cap - 9)
      p = U.randInt(1, 9)
      q = U.randInt(1, 9)
      if (p === q) return null
      exprL = c + ' + ' + p
      exprR = c + ' + ' + q
      left = c + p
      right = c + q
      think =
        '两边都是 ' + c + ' 加一个数，' + c + ' 不用算；加得多的大：' +
        Math.max(p, q) + ' 比 ' + Math.min(p, q) + ' 大，所以' + (p > q ? '左边' : '右边') + '大。'
    } else if (shape === 'sub1') {
      c = U.randInt(10, cap)
      p = U.randInt(1, 9)
      q = U.randInt(1, 9)
      if (p === q) return null
      exprL = c + ' − ' + p
      exprR = c + ' − ' + q
      left = c - p
      right = c - q
      think =
        '两边都是从 ' + c + ' 里减，' + c + ' 不用算；减得多的剩得少：' +
        (p > q ? '左边减 ' + p + '，减得多，左边反而小。' : '右边减 ' + q + '，减得多，右边反而小。')
    } else {
      c = U.randInt(1, 9)
      p = U.randInt(c + 1, cap)
      q = U.randInt(c + 1, cap)
      if (p === q) return null
      exprL = p + ' − ' + c
      exprR = q + ' − ' + c
      left = p - c
      right = q - c
      think =
        '两边减的都是 ' + c + '，' + c + ' 不用算；被减的数谁大，剩下的就谁多：' +
        Math.max(p, q) + ' 比 ' + Math.min(p, q) + ' 大，所以' + (p > q ? '左边' : '右边') + '大。'
    }
    var sym = symOf(left, right)
    return {
      topic: 'daxiao',
      variant: 'smart',
      stem: '在 ○ 里填上「>」「<」或「=」：' + exprL + ' ○ ' + exprR,
      answer: sym,
      unit: '',
      ansLabel: '答：○ 里填',
      ansSuffix: '。',
      workLabel: '比一比',
      solution: [
        { tag: '想一想', text: '两边的算式里藏着一个相同的数，把它盖住，只比不同的那个数——不用算出来！' },
        { tag: '比一比', text: think },
        { tag: '验一验', text: '真算一遍：' + exprL + ' = ' + left + '，' + exprR + ' = ' + right + '，' + left + ' ' + sym + ' ' + right + ' ✓' },
        { tag: '答', text: exprL + ' ' + sym + ' ' + exprR + '，○ 里填「' + sym + '」。' }
      ],
      key: 'smart:' + shape + ':' + c + ',' + p + ',' + q
    }
  }

  var DAXIAO = {
    id: 'daxiao',
    no: '01',
    stage: 'L1',
    name: '数的大小比较',
    lesson: {
      title: '数的大小比较 · 方法讲解',
      sections: [
        {
          heading: '这是什么问题？',
          paras: ['比较两个数（或两个算式）谁大谁小。数要会比，算式也要会比——有的算式不用算出来就能比！']
        },
        {
          heading: '怎么想？',
          paras: [
            '比两个数：先看位数，位数多的大；位数一样，从十位比起，十位一样再比个位。',
            '比算式：一般先算再比；但两边藏着相同的数时，把相同的盖住，只比不同的那个数——又快又不容易错。'
          ]
        },
        {
          heading: '例题示范',
          example: {
            stem: '在 ○ 里填上「>」「<」或「=」：15 + 8 ○ 15 + 6',
            solution: [
              { tag: '想一想', text: '两边都有 15，把 15 盖住，只比 8 和 6——不用算出来！' },
              { tag: '比一比', text: '两边都是 15 加一个数，加得多的大：8 比 6 大，所以左边大。' },
              { tag: '验一验', text: '真算一遍：15 + 8 = 23，15 + 6 = 21，23 > 21 ✓' },
              { tag: '答', text: '15 + 8 > 15 + 6，○ 里填「>」。' }
            ]
          }
        },
        { heading: '记住口诀', chant: '位数多的大，同位从头比；两边有相同，盖住比不同。' }
      ]
    },
    variants: [
      { id: 'num', setting: 'vDxNum', label: '两数比大小', gen: genNum },
      { id: 'expr', setting: 'vDxExpr', label: '算式与数比（先算再比）', gen: genExpr },
      { id: 'smart', setting: 'vDxSmart', label: '不用算的巧比', gen: genSmart }
    ],
    generate: function (s) {
      return U.generateFrom(DAXIAO.variants, s)
    },
    titleFor: function (s) {
      return '数的大小比较练习 · ' + U.diff(s).numMax + '以内'
    }
  }

  root.SumSum.aoshu.topics.daxiao = DAXIAO
  root.SumSum.aoshu.topicList.push(DAXIAO)
})(typeof window !== 'undefined' ? window : globalThis)
