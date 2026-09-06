/**
 * 知识点「33 还原问题初步」（L2）：知道结果，倒着推回最开始的数。
 * 变式：①两步还原（纯算式）②情景还原（故事版）③三步还原（可含 ×2/÷2，默认关）。
 * 全部先取原数正向构造，答案天然正确；解析倒推，验一验正向走一遍。
 */
(function (root) {
  'use strict'

  var U = root.SumSum.aoshu.util

  /* 各难度档的单步变化量上限 */
  var DCAP = { L1: 9, L2: 15, L3: 20 }

  function dcap(s) {
    return DCAP[s.difficulty] || DCAP.L1
  }

  /* 「加上 5」/「减去 3」的文字 */
  function opText(sign, d) {
    return (sign > 0 ? '加上 ' : '减去 ') + d
  }

  /* 倒推一步的解析文案 */
  function undoText(label, sign, d, from, to) {
    return (
      label + '是' + opText(sign, d) + '，倒回去要' + (sign > 0 ? '减' : '加') + '：' +
      from + (sign > 0 ? ' − ' : ' + ') + d + ' = ' + to + '。'
    )
  }

  /* 变式①两步还原：一个数 ±d1 再 ±d2 = r，求原数 */
  function gen2Step(s) {
    var cap = U.diff(s).numMax
    var x = U.randInt(1, cap)
    var s1 = U.pick([1, -1])
    var s2 = U.pick([1, -1])
    var d1 = U.randInt(2, dcap(s))
    var d2 = U.randInt(2, dcap(s))
    var m = x + s1 * d1
    var r = m + s2 * d2
    if (m < 0 || m > cap || r < 1 || r > cap) return null
    return {
      topic: 'huanyuan',
      variant: '2step',
      stem: '一个数' + opText(s1, d1) + '，再' + opText(s2, d2) + '，结果是 ' + r + '。这个数是几？',
      answer: x,
      unit: '',
      ansLabel: '答：这个数是',
      ansSuffix: '。',
      solution: [
        { tag: '想一想', text: '不知道开头的数，就从结果倒着走——每一步都反过来：加过的减回去，减过的加回去。' },
        { tag: '第 1 步', text: undoText('最后一步', s2, d2, r, m) },
        { tag: '第 2 步', text: undoText('前一步', s1, d1, m, x) },
        { tag: '验一验', text: '正着走一遍：' + x + (s1 > 0 ? ' + ' : ' − ') + d1 + ' = ' + m + '，' + m + (s2 > 0 ? ' + ' : ' − ') + d2 + ' = ' + r + ' ✓' },
        { tag: '答', text: '这个数是 ' + x + '。' }
      ],
      key: '2step:' + x + ',' + s1 * d1 + ',' + s2 * d2
    }
  }

  /* 故事里的动作短语（pos 为 2 时加「又」） */
  function storySeg(sign, d, u, itemName, B, pos) {
    var again = pos === 2 ? '又' : ''
    if (sign > 0) {
      return U.pick([again + '买了 ', again + '得到 ']) + d + ' ' + u + itemName
    }
    return U.pick([again + '给了' + B + ' ', again + '用掉了 ']) + d + ' ' + u + itemName
  }

  /* 变式②情景还原：同 v1 逻辑套进「原来有一些…」的故事 */
  function genStory(s) {
    var cap = U.diff(s).numMax
    var x = U.randInt(2, cap)
    var s1 = U.pick([1, -1])
    var s2 = U.pick([1, -1])
    var d1 = U.randInt(2, dcap(s))
    var d2 = U.randInt(2, dcap(s))
    var m = x + s1 * d1
    var r = m + s2 * d2
    if (m < 1 || m > cap || r < 1 || r > cap) return null
    var who = U.pickTwoNames()
    var A = who[0]
    var B = who[1]
    var it = U.pick(U.ITEMS)
    var u = it.u
    return {
      topic: 'huanyuan',
      variant: 'story',
      stem:
        A + '原来有一些' + it.n + '，' + storySeg(s1, d1, u, it.n, B, 1) + '，' +
        storySeg(s2, d2, u, it.n, B, 2) + '，现在有 ' + r + ' ' + u + '。' +
        A + '原来有几' + u + it.n + '？',
      answer: x,
      unit: u,
      ansLabel: '答：' + A + '原来有',
      ansSuffix: u + it.n + '。',
      solution: [
        { tag: '想一想', text: '从「现在有 ' + r + ' ' + u + '」倒着往回想：多了的去掉、少了的补回来。' },
        { tag: '第 1 步', text: '最后' + (s2 > 0 ? '多了' : '少了') + ' ' + d2 + ' ' + u + '，倒回去' + (s2 > 0 ? '减掉' : '补上') + '：' + r + (s2 > 0 ? ' − ' : ' + ') + d2 + ' = ' + m + '（' + u + '）。' },
        { tag: '第 2 步', text: '再往前' + (s1 > 0 ? '多了' : '少了') + ' ' + d1 + ' ' + u + '，倒回去' + (s1 > 0 ? '减掉' : '补上') + '：' + m + (s1 > 0 ? ' − ' : ' + ') + d1 + ' = ' + x + '（' + u + '）。' },
        { tag: '验一验', text: '正着走一遍：' + x + (s1 > 0 ? ' + ' : ' − ') + d1 + ' = ' + m + '，' + m + (s2 > 0 ? ' + ' : ' − ') + d2 + ' = ' + r + ' ✓' },
        { tag: '答', text: A + '原来有 ' + x + ' ' + u + it.n + '。' }
      ],
      key: 'story:' + x + ',' + s1 * d1 + ',' + s2 * d2
    }
  }

  /* 变式③三步还原：三步操作，最多一步是 ×2 或 ÷2 */
  function gen3Step(s) {
    var cap = U.diff(s).numMax
    var x = U.randInt(1, Math.max(4, Math.floor(cap / 2)))
    var useMul = Math.random() < 0.6
    var mulAt = U.randInt(0, 2)
    var ops = []
    var vals = [x]
    for (var i = 0; i < 3; i++) {
      var v = vals[i]
      var op
      if (useMul && i === mulAt) {
        if (v >= 2 && v % 2 === 0 && Math.random() < 0.5) op = { t: 'div' }
        else if (v * 2 <= cap) op = { t: 'mul' }
        else if (v >= 2 && v % 2 === 0) op = { t: 'div' }
        else return null
      } else {
        op = { t: U.pick(['add', 'sub']), d: U.randInt(2, dcap(s)) }
      }
      var next
      if (op.t === 'add') next = v + op.d
      else if (op.t === 'sub') next = v - op.d
      else if (op.t === 'mul') next = v * 2
      else next = v / 2
      if (next < 0 || next > cap || !Number.isInteger(next)) return null
      ops.push(op)
      vals.push(next)
    }
    if (vals[3] < 1) return null

    function fwdText(op) {
      if (op.t === 'add') return '加上 ' + op.d
      if (op.t === 'sub') return '减去 ' + op.d
      if (op.t === 'mul') return '乘 2'
      return '除以 2'
    }
    function undoStep(op, from, to) {
      if (op.t === 'add') return '这一步是加 ' + op.d + '，倒回去减：' + from + ' − ' + op.d + ' = ' + to + '。'
      if (op.t === 'sub') return '这一步是减 ' + op.d + '，倒回去加：' + from + ' + ' + op.d + ' = ' + to + '。'
      if (op.t === 'mul') return '这一步是乘 2，倒回去除以 2：' + from + ' ÷ 2 = ' + to + '。'
      return '这一步是除以 2，倒回去乘 2：' + from + ' × 2 = ' + to + '。'
    }
    function fwdCalc(op, v) {
      if (op.t === 'add') return v + ' + ' + op.d
      if (op.t === 'sub') return v + ' − ' + op.d
      if (op.t === 'mul') return v + ' × 2'
      return v + ' ÷ 2'
    }
    return {
      topic: 'huanyuan',
      variant: '3step',
      stem:
        '一个数' + fwdText(ops[0]) + '，再' + fwdText(ops[1]) + '，再' + fwdText(ops[2]) +
        '，结果是 ' + vals[3] + '。这个数是几？',
      answer: x,
      unit: '',
      ansLabel: '答：这个数是',
      ansSuffix: '。',
      solution: [
        { tag: '想一想', text: '三步就倒着退三次，最后做的最先退（加↔减、乘↔除都要反过来）。' },
        { tag: '第 1 步', text: undoStep(ops[2], vals[3], vals[2]) },
        { tag: '第 2 步', text: undoStep(ops[1], vals[2], vals[1]) },
        { tag: '第 3 步', text: undoStep(ops[0], vals[1], vals[0]) },
        { tag: '验一验', text: '正着走：' + fwdCalc(ops[0], vals[0]) + ' = ' + vals[1] + '，' + fwdCalc(ops[1], vals[1]) + ' = ' + vals[2] + '，' + fwdCalc(ops[2], vals[2]) + ' = ' + vals[3] + ' ✓' },
        { tag: '答', text: '这个数是 ' + x + '。' }
      ],
      key:
        '3step:' + x + ',' +
        ops
          .map(function (op) {
            if (op.t === 'add') return '+' + op.d
            if (op.t === 'sub') return '-' + op.d
            return op.t
          })
          .join(',')
    }
  }

  var HUANYUAN = {
    id: 'huanyuan',
    no: '33',
    stage: 'L2',
    name: '还原问题初步',
    lesson: {
      title: '还原问题 · 方法讲解',
      sections: [
        {
          heading: '这是什么问题？',
          paras: ['只告诉你「变来变去之后的结果」，要找回最开始的数——这就是还原问题，也叫「倒推法」。']
        },
        {
          heading: '怎么想？',
          paras: [
            '就像走迷宫走到了终点，要回到入口，只要原路返回。',
            '倒着走时，每一步都要「反着做」：加过 5 的就减 5，减过 3 的就加 3，乘过 2 的就除以 2。最后做的那一步，要最先倒回去。'
          ]
        },
        {
          heading: '例题示范',
          example: {
            stem: '一个数加上 5，再减去 3，结果是 12。这个数是几？',
            solution: [
              { tag: '想一想', text: '从结果 12 倒着走，每一步反过来。' },
              { tag: '第 1 步', text: '最后一步是减去 3，倒回去要加：12 + 3 = 15。' },
              { tag: '第 2 步', text: '前一步是加上 5，倒回去要减：15 − 5 = 10。' },
              { tag: '验一验', text: '正着走一遍：10 + 5 = 15，15 − 3 = 12 ✓' },
              { tag: '答', text: '这个数是 10。' }
            ]
          }
        },
        { heading: '记住口诀', chant: '结果往回走，加减要对调；一步退一步，回到最开头。' }
      ]
    },
    variants: [
      { id: '2step', setting: 'vHy2Step', label: '两步还原（算式版）', gen: gen2Step },
      { id: 'story', setting: 'vHyStory', label: '情景还原（故事版）', gen: genStory },
      { id: '3step', setting: 'vHy3Step', label: '三步还原（含乘除）', def: false, gen: gen3Step }
    ],
    generate: function (s) {
      return U.generateFrom(HUANYUAN.variants, s)
    },
    titleFor: function (s) {
      return '还原问题练习 · ' + U.diff(s).numMax + '以内'
    }
  }

  root.SumSum.aoshu.topics.huanyuan = HUANYUAN
  root.SumSum.aoshu.topicList.push(HUANYUAN)
})(typeof window !== 'undefined' ? window : globalThis)
