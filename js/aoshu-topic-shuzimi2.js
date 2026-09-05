/**
 * 知识点「07 数字谜问题（提高篇）」：数位谜（□5 + 3□ = 68）与双条件符号谜。
 * 数位谜的两个 □ 永远一个在个位列、一个在十位列（交叉遮挡），
 * 生成后枚举全部数字组合验证恰好一个解，多解/无解丢弃重出。
 * 变式：①加法数位谜 ②双条件符号谜 ③减法数位谜（稍难默认关）。
 */
(function (root) {
  'use strict'

  var U = root.SumSum.aoshu.util

  function digitsOf(x) {
    return { t: Math.floor(x / 10), o: x % 10 }
  }

  /* 两位数带一个被遮数位的显示，如 mask='t' → '□5'，mask='o' → '3□' */
  function maskText(d, mask) {
    return mask === 't' ? '□' + d.o : String(d.t) + '□'
  }

  /* 枚举唯一解：A、B 各遮一位（交叉数位），数出满足 A±B=C 的组合个数 */
  function countSolutions(da, db, C, maskA, maskB, isSub) {
    var count = 0
    var xFrom = maskA === 't' ? 1 : 0
    var yFrom = maskB === 't' ? 1 : 0
    for (var x = xFrom; x <= 9; x++) {
      for (var y = yFrom; y <= 9; y++) {
        var A = maskA === 't' ? x * 10 + da.o : da.t * 10 + x
        var B = maskB === 't' ? y * 10 + db.o : db.t * 10 + y
        if (isSub ? A - B === C && A >= B : A + B === C) count++
      }
    }
    return count
  }

  /* 变式①加法数位谜：A + B = C（都是两位数），交叉遮住两个数位 */
  function genDigit(s) {
    var A = U.randInt(10, 89)
    if (99 - A < 10) return null
    var B = U.randInt(10, 99 - A)
    var C = A + B
    var da = digitsOf(A)
    var db = digitsOf(B)
    var dc = digitsOf(C)
    var carry = da.o + db.o >= 10
    /* 入门档以不进位为主，少量进位题保留（完全没有也失真） */
    if (s.difficulty === 'L1' && carry && Math.random() < 0.7) return null
    var maskA = U.pick(['t', 'o'])
    var maskB = maskA === 't' ? 'o' : 't'
    if (countSolutions(da, db, C, maskA, maskB, false) !== 1) return null

    /* 个位列：一个已知数字 k、一个被遮 m */
    var onesExpr = maskA === 'o' ? '□ + ' + db.o : da.o + ' + □'
    var onesKnown = maskA === 'o' ? db.o : da.o
    var onesMasked = maskA === 'o' ? da.o : db.o
    var onesText = carry
      ? '个位：' + onesExpr + ' 要得 ' + dc.o + '？可 ' + onesKnown + ' 已经比 ' + dc.o + ' 大——说明满十进 1 了：' + onesExpr + ' = ' + (dc.o + 10) + '，□ = ' + onesMasked + '，向十位进 1。'
      : '个位：' + onesExpr + ' = ' + dc.o + '，□ = ' + onesMasked + '。'

    var tensExpr = maskA === 't' ? '□ + ' + db.t : da.t + ' + □'
    var tensMasked = maskA === 't' ? da.t : db.t
    var tensText = '十位：' + tensExpr + (carry ? ' + 进上来的 1' : '') + ' = ' + dc.t + '，□ = ' + tensMasked + '。'

    var mA = maskA === 't' ? da.t : da.o
    var mB = maskB === 't' ? db.t : db.o
    return {
      topic: 'shuzimi2',
      variant: 'digit',
      stem: '每个 □ 是一个数字：' + maskText(da, maskA) + ' + ' + maskText(db, maskB) + ' = ' + C + '。两个 □ 各是几？',
      answer: mA + '、' + mB,
      unit: '',
      ansLabel: '答：两个 □ 从左到右分别是',
      ansSuffix: '。',
      solution: [
        { tag: '想一想', text: '两位数相加，把个位和十位分开看，先从个位下手。' },
        { tag: '第 1 步', text: onesText },
        { tag: '第 2 步', text: tensText },
        { tag: '验一验', text: A + ' + ' + B + ' = ' + C + ' ✓' },
        { tag: '答', text: '两个 □ 从左到右分别是 ' + mA + ' 和 ' + mB + '（' + A + ' + ' + B + ' = ' + C + '）。' }
      ],
      key: 'digit:' + A + '+' + B + ':' + maskA + maskB
    }
  }

  /* 变式②双条件符号谜：○+○+△ = s1，○+△ = s2。亮点是「两条比一比」 */
  function genThree(s) {
    var cap = U.diff(s).numMax
    var top = s.difficulty === 'L1' ? 9 : 20
    var o = U.randInt(1, top)
    var t = U.randInt(1, top)
    var s1 = 2 * o + t
    var s2 = o + t
    if (s1 > cap) return null
    return {
      topic: 'shuzimi2',
      variant: 'three',
      stem: '○ + ○ + △ = ' + s1 + '，○ + △ = ' + s2 + '。△ 是几？',
      answer: t,
      unit: '',
      ansLabel: '答：△ 是',
      ansSuffix: '。',
      solution: [
        { tag: '想一想', text: '两条算式比一比：第一条比第二条多了一个 ○，和也多了 ' + s1 + ' − ' + s2 + ' = ' + o + '——多出来的正好是 ○，所以 ○ = ' + o + '。' },
        { tag: '第 2 步', text: '把 ○ = ' + o + ' 带进第二条：' + o + ' + △ = ' + s2 + '，△ = ' + s2 + ' − ' + o + ' = ' + t + '。' },
        { tag: '验一验', text: o + ' + ' + o + ' + ' + t + ' = ' + s1 + ' ✓，' + o + ' + ' + t + ' = ' + s2 + ' ✓' },
        { tag: '答', text: '△ 是 ' + t + '（○ 是 ' + o + '）。' }
      ],
      key: 'three:' + o + ',' + t
    }
  }

  /* 变式③减法数位谜：A − B = C，交叉遮住两个数位，含退位讲解 */
  function genSub(s) {
    var B = U.randInt(10, 88)
    if (99 - B < 10) return null
    var C = U.randInt(10, 99 - B)
    var A = B + C
    var da = digitsOf(A)
    var db = digitsOf(B)
    var dc = digitsOf(C)
    var borrow = da.o < db.o
    if (s.difficulty === 'L1' && borrow && Math.random() < 0.7) return null
    var maskA = U.pick(['t', 'o'])
    var maskB = maskA === 't' ? 'o' : 't'
    if (countSolutions(da, db, C, maskA, maskB, true) !== 1) return null

    var onesText
    if (maskA === 'o') {
      /* A 的个位被遮：不借位时 □ = dc.o + db.o；要是这样算出来超过 9，说明借了位 */
      onesText = borrow
        ? '个位：要是不借位，□ − ' + db.o + ' = ' + dc.o + ' 的 □ 得是 ' + (dc.o + db.o) + '，超过 9 了——说明向十位借了 1：□ + 10 − ' + db.o + ' = ' + dc.o + '，□ = ' + da.o + '。'
        : '个位：□ − ' + db.o + ' = ' + dc.o + '，□ = ' + da.o + '。'
    } else {
      /* B 的个位被遮：差的个位比被减数个位还大，说明借了位 */
      onesText = borrow
        ? '个位：' + da.o + ' 比 ' + dc.o + ' 还小，说明向十位借了 1：' + da.o + ' + 10 − □ = ' + dc.o + '，□ = ' + db.o + '。'
        : '个位：' + da.o + ' − □ = ' + dc.o + '，□ = ' + db.o + '。'
    }

    var tensText
    if (maskA === 't') {
      tensText = borrow
        ? '十位：□ 被借走 1，(□ − 1) − ' + db.t + ' = ' + dc.t + '，□ = ' + da.t + '。'
        : '十位：□ − ' + db.t + ' = ' + dc.t + '，□ = ' + da.t + '。'
    } else {
      tensText = borrow
        ? '十位：' + da.t + ' 借走 1 还剩 ' + (da.t - 1) + '：' + (da.t - 1) + ' − □ = ' + dc.t + '，□ = ' + db.t + '。'
        : '十位：' + da.t + ' − □ = ' + dc.t + '，□ = ' + db.t + '。'
    }

    var mA = maskA === 't' ? da.t : da.o
    var mB = maskB === 't' ? db.t : db.o
    return {
      topic: 'shuzimi2',
      variant: 'sub',
      stem: '每个 □ 是一个数字：' + maskText(da, maskA) + ' − ' + maskText(db, maskB) + ' = ' + C + '。两个 □ 各是几？',
      answer: mA + '、' + mB,
      unit: '',
      ansLabel: '答：两个 □ 从左到右分别是',
      ansSuffix: '。',
      solution: [
        { tag: '想一想', text: '两位数相减，也是把个位和十位分开看，先从个位下手。' },
        { tag: '第 1 步', text: onesText },
        { tag: '第 2 步', text: tensText },
        { tag: '验一验', text: A + ' − ' + B + ' = ' + C + ' ✓' },
        { tag: '答', text: '两个 □ 从左到右分别是 ' + mA + ' 和 ' + mB + '（' + A + ' − ' + B + ' = ' + C + '）。' }
      ],
      key: 'sub:' + A + '-' + B + ':' + maskA + maskB
    }
  }

  var SHUZIMI2 = {
    id: 'shuzimi2',
    no: '07',
    stage: 'L1',
    name: '数字谜问题（提高篇）',
    lesson: {
      title: '数字谜（提高）· 方法讲解',
      sections: [
        {
          heading: '这是什么问题？',
          paras: ['算式里的某些数字被 □ 挡住了，要按数位的规矩把它们一个个推出来。']
        },
        {
          heading: '怎么想？',
          paras: [
            '把个位和十位分开看，先从个位下手；个位对不上时，想想是不是「满十进一」或「借一当十」了。',
            '两个条件的符号谜，就把两条算式比一比：多了哪个符号，和就多了多少。'
          ]
        },
        {
          heading: '例题示范',
          example: {
            stem: '每个 □ 是一个数字：□4 + 2□ = 71。两个 □ 各是几？',
            solution: [
              { tag: '想一想', text: '把个位和十位分开看，先从个位下手。' },
              { tag: '第 1 步', text: '个位：4 + □ 要得 1？可 4 已经比 1 大——说明满十进 1 了：4 + □ = 11，□ = 7，向十位进 1。' },
              { tag: '第 2 步', text: '十位：□ + 2 + 进上来的 1 = 7，□ = 4。' },
              { tag: '验一验', text: '44 + 27 = 71 ✓' },
              { tag: '答', text: '两个 □ 从左到右分别是 4 和 7（44 + 27 = 71）。' }
            ]
          }
        },
        { heading: '记住口诀', chant: '数位分开看，个位打头阵；满十要进一，借一要还一。' }
      ]
    },
    variants: [
      { id: 'digit', setting: 'vSm2Digit', label: '加法数位谜（□5 + 3□）', gen: genDigit },
      { id: 'three', setting: 'vSm2Three', label: '双条件符号谜（比一比）', gen: genThree },
      { id: 'sub', setting: 'vSm2Sub', label: '减法数位谜（含退位）', def: false, gen: genSub }
    ],
    generate: function (s) {
      return U.generateFrom(SHUZIMI2.variants, s)
    },
    titleFor: function (s) {
      return '数字谜练习（提高）· ' + U.DIFF_LABEL[s.difficulty]
    }
  }

  root.SumSum.aoshu.topics.shuzimi2 = SHUZIMI2
  root.SumSum.aoshu.topicList.push(SHUZIMI2)
})(typeof window !== 'undefined' ? window : globalThis)
