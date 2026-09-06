/**
 * 知识点「12 枚举法初步」：把所有情况有顺序地一个一个列出来数——有序、不重、不漏。
 * 变式：①凑钱 ②摆两位数 ③握手问题（稍难默认关）。
 * 解析里的「列一列」必须完整列出所有情况，行数与答案严格一致（自测校验）。
 */
(function (root) {
  'use strict'

  var U = root.SumSum.aoshu.util

  /* 变式①凑钱：用 c 元和 1 元凑出 n 元，按 c 元个数从多到少列全 */
  function genPay(s) {
    var c = U.pick([2, 5])
    var n
    if (c === 2) {
      var R2 = { L1: [4, 7], L2: [6, 10], L3: [9, 11] }[s.difficulty] || [4, 7]
      n = U.randInt(R2[0], R2[1])
    } else {
      var R5 = { L1: [6, 12], L2: [8, 15], L3: [11, 18] }[s.difficulty] || [6, 12]
      n = U.randInt(R5[0], R5[1])
      if (n % 5 === 0 && Math.random() < 0.5) n += 1 // 别总是整凑
    }
    var kmax = Math.floor(n / c)
    if (kmax < 1) return null
    var answer = kmax + 1
    var rows = []
    for (var k = kmax; k >= 0; k--) {
      rows.push(c + ' 元 ' + k + ' 个 + 1 元 ' + (n - c * k) + ' 个')
    }
    return {
      topic: 'meiju',
      variant: 'pay',
      stem: '用 ' + c + ' 元和 1 元的硬币凑出 ' + n + ' 元，有几种不同的凑法？',
      answer: answer,
      unit: '种',
      ansLabel: '答：一共有',
      ansSuffix: '种凑法。',
      workLabel: '列一列',
      solution: [
        { tag: '想一想', text: '按 ' + c + ' 元硬币的个数，从最多开始一行一行往下列，才能一个不漏。' },
        { tag: '列一列', text: rows.join('；') + '。' },
        { tag: '数一数', text: '数一数，一共列了 ' + answer + ' 行，就是 ' + answer + ' 种。' },
        { tag: '验一验', text: c + ' 元的个数从 ' + kmax + ' 个一直数到 0 个，每种都列到了，不重不漏 ✓' },
        { tag: '答', text: '一共有 ' + answer + ' 种不同的凑法。' }
      ],
      key: 'pay:' + c + ':' + n
    }
  }

  /* 变式②摆两位数：三张互不相同的数字卡片，0 不能放十位 */
  function genDigit(s) {
    var withZero = Math.random() < 0.35
    var ds = []
    var pool = [1, 2, 3, 4, 5, 6, 7, 8, 9]
    var take = withZero ? 2 : 3
    for (var i = 0; i < take; i++) {
      ds.push(pool.splice(U.randInt(0, pool.length - 1), 1)[0])
    }
    if (withZero) ds.push(0)
    ds.sort(function (a, b) {
      return a - b
    })
    var tens = ds.filter(function (d) {
      return d !== 0
    })
    var answer = tens.length * 2
    var rows = tens.map(function (t) {
      var us = ds.filter(function (d) {
        return d !== t
      })
      return '十位是 ' + t + ' 时：' + us.map(function (u) {
        return String(t) + String(u)
      }).join('、')
    })
    var counting = tens.map(function () {
      return '2'
    }).join(' + ') + ' = ' + answer + '（个）'
    return {
      topic: 'meiju',
      variant: 'digit',
      stem: '用数字卡片 ' + ds.join('、') + ' 摆两位数（每张卡片只能用一次），能摆出几个不同的两位数？',
      answer: answer,
      unit: '个',
      ansLabel: '答：能摆出',
      ansSuffix: '个不同的两位数。',
      workLabel: '列一列',
      solution: [
        { tag: '想一想', text: '按十位从小到大，一组一组地列。' + (withZero ? '注意：0 不能放在十位（0 开头就不是两位数了）。' : '') },
        { tag: '列一列', text: rows.join('；') + '。' },
        { tag: '数一数', text: '每个十位都能配 2 个个位：' + counting + '。' },
        { tag: '验一验', text: '十位按从小到大列的，每组里个位也没重复，不重不漏 ✓' },
        { tag: '答', text: '能摆出 ' + answer + ' 个不同的两位数。' }
      ],
      key: 'digit:' + ds.join(',')
    }
  }

  /* 变式③握手问题：给小朋友编号 ①②③…，每人只和排在自己后面的人算一次 */
  function genShake(s) {
    var R = { L1: [3, 4], L2: [4, 5], L3: [4, 5] }[s.difficulty] || [3, 4]
    var n = U.randInt(R[0], R[1])
    var marks = '①②③④⑤'.slice(0, n)
    var answer = (n * (n - 1)) / 2
    var rows = []
    for (var i = 0; i < n - 1; i++) {
      var ps = []
      for (var j = i + 1; j < n; j++) ps.push(marks[i] + marks[j])
      rows.push(marks[i] + ' 和后面的每个人握：' + ps.join('、'))
    }
    var chainParts = []
    for (var k = n - 1; k >= 1; k--) chainParts.push(k)
    var chain = chainParts.join(' + ') + ' = ' + answer
    return {
      topic: 'meiju',
      variant: 'shake',
      stem: '给 ' + n + ' 个小朋友编号 ' + marks + '，每两个人都要握一次手。一共要握几次手？',
      answer: answer,
      unit: '次',
      ansLabel: '答：一共要握',
      ansSuffix: '次手。',
      workLabel: '列一列',
      solution: [
        { tag: '想一想', text: '① 和 ② 握过手，② 就不用再和 ① 握了——每人只和「排在自己后面」的人算一次，才不会重复。' },
        { tag: '列一列', text: rows.join('；') + '。' },
        { tag: '数一数', text: '每行的次数是 ' + chain + '（次）。' },
        { tag: '验一验', text: '每一对小朋友都出现了一次、也只出现一次，不重不漏 ✓' },
        { tag: '答', text: '一共要握 ' + answer + ' 次手。' }
      ],
      key: 'shake:' + n
    }
  }

  var MEIJU = {
    id: 'meiju',
    no: '12',
    stage: 'L1',
    name: '枚举法初步',
    lesson: {
      title: '枚举法初步 · 方法讲解',
      sections: [
        {
          heading: '这是什么问题？',
          paras: ['有些题不是一步算出来的，要把所有情况一个一个列出来数——这就是枚举法。本事全在六个字：有序、不重、不漏。']
        },
        {
          heading: '怎么想？',
          paras: [
            '先定一个顺序再动手列：比如按 2 元硬币的个数从多到少、按十位从小到大。',
            '列完一行再列下一行，列到头就停；最后数一数一共几行，就是几种。'
          ]
        },
        {
          heading: '例题示范',
          example: {
            stem: '用 2 元和 1 元的硬币凑出 5 元，有几种不同的凑法？',
            solution: [
              { tag: '想一想', text: '按 2 元硬币的个数，从最多开始一行一行往下列。' },
              { tag: '列一列', text: '2 元 2 个 + 1 元 1 个；2 元 1 个 + 1 元 3 个；2 元 0 个 + 1 元 5 个。' },
              { tag: '数一数', text: '一共列了 3 行，就是 3 种。' },
              { tag: '验一验', text: '2 元的个数从 2 个数到 0 个，每种都列到了，不重不漏 ✓' },
              { tag: '答', text: '一共有 3 种不同的凑法。' }
            ]
          }
        },
        { heading: '记住口诀', chant: '定好顺序列一列，不重不漏数一数。' }
      ]
    },
    variants: [
      { id: 'pay', setting: 'vMjPay', label: '凑钱（几种凑法）', gen: genPay },
      { id: 'digit', setting: 'vMjDigit', label: '摆两位数（能摆几个）', gen: genDigit },
      { id: 'shake', setting: 'vMjShake', label: '握手问题', def: false, gen: genShake }
    ],
    generate: function (s) {
      return U.generateFrom(MEIJU.variants, s)
    },
    titleFor: function (s) {
      return '枚举法练习 · ' + U.DIFF_LABEL[s.difficulty]
    }
  }

  root.SumSum.aoshu.topics.meiju = MEIJU
  root.SumSum.aoshu.topicList.push(MEIJU)
})(typeof window !== 'undefined' ? window : globalThis)
