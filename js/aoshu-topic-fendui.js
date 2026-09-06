/**
 * 知识点「13 分堆与枚举」：把一堆东西分成几堆，有序地列出所有分法。
 * 变式：①分两堆 ②两堆不一样多 ③分三堆（稍难默认关）。
 * 关键约定：两堆只是位置不同（3 和 4 与 4 和 3）算同一种。
 * 解析「列一列」必须完整列出所有分法，行数与答案严格一致（自测校验）。
 */
(function (root) {
  'use strict'

  var U = root.SumSum.aoshu.util

  var RANGE = { L1: [4, 9], L2: [8, 12], L3: [10, 13] }

  function pickN(s) {
    var r = RANGE[s.difficulty] || RANGE.L1
    return U.randInt(r[0], r[1])
  }

  /* 变式①分两堆：每堆至少 1 个，不分先后，共 floor(n/2) 种 */
  function genTwo(s) {
    var n = pickN(s)
    var it = U.pick(U.ITEMS)
    var kmax = Math.floor(n / 2)
    var answer = kmax
    var rows = []
    for (var i = 1; i <= kmax; i++) {
      rows.push(i + ' 和 ' + (n - i))
    }
    var dupX = kmax + 1
    var dupY = n - dupX
    return {
      topic: 'fendui',
      variant: 'two',
      stem: '把 ' + n + ' ' + it.u + it.n + '分成两堆，每堆至少 1 ' + it.u + '（两堆只是换个位置的算同一种），有几种分法？',
      answer: answer,
      unit: '种',
      ansLabel: '答：一共有',
      ansSuffix: '种分法。',
      workLabel: '列一列',
      solution: [
        { tag: '想一想', text: '从最小的一堆想起：先分「1 和 ' + (n - 1) + '」，再「2 和 ' + (n - 2) + '」……一行一行往下列。' },
        { tag: '列一列', text: rows.join('、') + '。再往下的「' + dupX + ' 和 ' + dupY + '」跟「' + dupY + ' 和 ' + dupX + '」是同一种，不用再列了。' },
        { tag: '数一数', text: '一共列了 ' + answer + ' 行，就是 ' + answer + ' 种分法。' },
        { tag: '验一验', text: '每行两堆合起来都是 ' + n + ' ' + it.u + '，小堆从 1 数到 ' + kmax + '，不重不漏 ✓' },
        { tag: '答', text: '一共有 ' + answer + ' 种分法。' }
      ],
      key: 'two:' + n
    }
  }

  /* 变式②两堆不一样多：偶数时要去掉「平分」那一种，共 floor((n−1)/2) 种 */
  function genDiffer(s) {
    var n = pickN(s)
    var it = U.pick(U.ITEMS)
    var answer = Math.floor((n - 1) / 2)
    if (answer < 2) return null
    var rows = []
    for (var i = 1; i <= answer; i++) {
      rows.push(i + ' 和 ' + (n - i))
    }
    var evenNote =
      n % 2 === 0
        ? '注意：「' + n / 2 + ' 和 ' + n / 2 + '」两堆一样多，不符合要求，去掉！'
        : '正好没有能平分的情况，列出来的每行两堆都不一样多。'
    return {
      topic: 'fendui',
      variant: 'differ',
      stem: '把 ' + n + ' ' + it.u + it.n + '分成两堆，每堆至少 1 ' + it.u + '，而且两堆不能一样多（换个位置的算同一种），有几种分法？',
      answer: answer,
      unit: '种',
      ansLabel: '答：一共有',
      ansSuffix: '种分法。',
      workLabel: '列一列',
      solution: [
        { tag: '想一想', text: '还是从最小的一堆列起，但多了一条规矩：两堆不能一样多。' },
        { tag: '列一列', text: rows.join('、') + '。' + evenNote },
        { tag: '数一数', text: '一共列了 ' + answer + ' 行，就是 ' + answer + ' 种分法。' },
        { tag: '验一验', text: '每行两堆合起来都是 ' + n + ' ' + it.u + '，而且没有一行是平分的 ✓' },
        { tag: '答', text: '一共有 ' + answer + ' 种分法。' }
      ],
      key: 'differ:' + n
    }
  }

  /* 变式③分三堆：a ≤ b ≤ c 有序枚举，程序算出所有组合 */
  function genThree(s) {
    var R = { L1: [6, 9], L2: [7, 10], L3: [8, 10] }[s.difficulty] || [6, 9]
    var n = U.randInt(R[0], R[1])
    var it = U.pick(U.ITEMS)
    var rows = []
    for (var a = 1; a <= Math.floor(n / 3); a++) {
      for (var b = a; b <= Math.floor((n - a) / 2); b++) {
        rows.push(a + '、' + b + '、' + (n - a - b))
      }
    }
    var answer = rows.length
    return {
      topic: 'fendui',
      variant: 'three',
      stem: '把 ' + n + ' ' + it.u + it.n + '分成三堆，每堆至少 1 ' + it.u + '（只是换位置的算同一种），有几种分法？',
      answer: answer,
      unit: '种',
      ansLabel: '答：一共有',
      ansSuffix: '种分法。',
      workLabel: '列一列',
      solution: [
        { tag: '想一想', text: '定个规矩再列：三堆从小到大排（第一堆 ≤ 第二堆 ≤ 第三堆），这样换位置的就不会重复出现。' },
        { tag: '列一列', text: rows.join('；') + '。' },
        { tag: '数一数', text: '一共列了 ' + answer + ' 行，就是 ' + answer + ' 种分法。' },
        { tag: '验一验', text: '第一堆从 1 试到 ' + Math.floor(n / 3) + '，每行三堆合起来都是 ' + n + ' ' + it.u + '，不重不漏 ✓' },
        { tag: '答', text: '一共有 ' + answer + ' 种分法。' }
      ],
      key: 'three:' + n
    }
  }

  var FENDUI = {
    id: 'fendui',
    no: '13',
    stage: 'L1',
    name: '分堆与枚举',
    lesson: {
      title: '分堆与枚举 · 方法讲解',
      sections: [
        {
          heading: '这是什么问题？',
          paras: ['把一堆东西分成几堆，问有几种分法。它和枚举法是一家人：都要有顺序地把每种情况列出来数。']
        },
        {
          heading: '怎么想？',
          paras: [
            '从最小的一堆想起，一行一行往下列：1 和几、2 和几……',
            '最要紧的规矩：「3 和 4」与「4 和 3」只是换了个位置，算同一种——列到一半就该停，再列就重复了。'
          ]
        },
        {
          heading: '例题示范',
          example: {
            stem: '把 6 个苹果分成两堆，每堆至少 1 个（换个位置的算同一种），有几种分法？',
            solution: [
              { tag: '想一想', text: '从最小的一堆想起：先分「1 和 5」，再「2 和 4」……一行一行往下列。' },
              { tag: '列一列', text: '1 和 5、2 和 4、3 和 3。再往下的「4 和 2」跟「2 和 4」是同一种，不用再列了。' },
              { tag: '数一数', text: '一共列了 3 行，就是 3 种分法。' },
              { tag: '验一验', text: '每行两堆合起来都是 6 个，小堆从 1 数到 3，不重不漏 ✓' },
              { tag: '答', text: '一共有 3 种分法。' }
            ]
          }
        },
        { heading: '记住口诀', chant: '小堆从一起，列到一半停；换位一样的，只能算一种。' }
      ]
    },
    variants: [
      { id: 'two', setting: 'vFdTwo', label: '分两堆（几种分法）', gen: genTwo },
      { id: 'differ', setting: 'vFdDiffer', label: '两堆不一样多', gen: genDiffer },
      { id: 'three', setting: 'vFdThree', label: '分三堆', def: false, gen: genThree }
    ],
    generate: function (s) {
      return U.generateFrom(FENDUI.variants, s)
    },
    titleFor: function (s) {
      return '分堆与枚举练习 · ' + U.DIFF_LABEL[s.difficulty]
    }
  }

  root.SumSum.aoshu.topics.fendui = FENDUI
  root.SumSum.aoshu.topicList.push(FENDUI)
})(typeof window !== 'undefined' ? window : globalThis)
