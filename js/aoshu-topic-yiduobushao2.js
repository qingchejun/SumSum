/**
 * 知识点「04 移多补少（提高篇）」：基础篇的进阶。
 * 核心两条：①每移 1 个，差距缩小 2；②不管怎么移，两人的总数不变。
 * 变式：①移过头反超 ②指定剩差求移动数 ③知总数与移动数倒推原数（稍难默认关）。
 */
(function (root) {
  'use strict'

  var U = root.SumSum.aoshu.util

  /* 原始状态的圆点对比图：●是共同的部分，○是多出来的部分（同基础篇构图） */
  function gapDiagram(A, B, b, gap, note) {
    return {
      rows: [
        { label: A, groups: [{ type: 'solid', n: b }, { type: 'hollow', n: gap }] },
        { label: B, groups: [{ type: 'solid', n: b }] }
      ],
      note: note
    }
  }

  /* 变式①移过头反超：A 给出的 n 超过差的一半，答 r = 2n − d（B 反超的数量） */
  function genOver(s) {
    var d0 = U.diff(s)
    var n = U.randInt(2, Math.max(2, d0.moveMax))
    var r = U.randInt(1, 2 * n - 2)
    var d = 2 * n - r // 原差，≥ 2
    var bMin = Math.max(1, r - n + 1) // 保证 A 给出后至少还剩 1 个
    if (d0.numMax - d < bMin) return null
    var b = U.randInt(bMin, d0.numMax - d)
    var a = b + d
    if (b + n > d0.numMax) return null // B 移入后也不超出难度范围
    var who = U.pickTwoNames()
    var it = U.pick(U.ITEMS)
    var A = who[0]
    var B = who[1]
    var u = it.u
    return {
      topic: 'yiduobushao2',
      variant: 'over',
      stem:
        A + '有 ' + a + ' ' + u + it.n + '，' + B + '有 ' + b + ' ' + u + it.n + '。' +
        A + '给了' + B + ' ' + n + ' ' + u + it.n + '，现在谁的' + it.n + '多？多几' + u + '？',
      answer: r,
      unit: u,
      ansLabel: '答：现在是＿＿＿多，多',
      ansSuffix: ' ' + u + it.n + '。',
      diagram:
        a <= 20
          ? gapDiagram(A, B, b, d, '○ 是原来多出的 ' + d + ' ' + u + '；' + A + '给出的 ' + n + ' ' + u + '比一半还多，就反超了')
          : null,
      solution: [
        { tag: '想一想', text: A + '给 1 ' + u + '，差距就缩小 2 ' + u + '。这次给了 ' + n + ' ' + u + '，缩小 ' + n + ' + ' + n + ' = ' + 2 * n + ' ' + u + '——比原来的差距还大，就会反超！' },
        { tag: '第 1 步', text: '原来多多少：' + a + ' − ' + b + ' = ' + d + '（' + u + '）。' },
        { tag: '第 2 步', text: '差距缩小了 ' + 2 * n + ' ' + u + '：' + 2 * n + ' − ' + d + ' = ' + r + '（' + u + '），反超 ' + r + ' ' + u + '。' },
        { tag: '验一验', text: A + ' ' + a + ' − ' + n + ' = ' + (a - n) + '（' + u + '），' + B + ' ' + b + ' + ' + n + ' = ' + (b + n) + '（' + u + '），' + B + '多 ' + r + ' ' + u + ' ✓' },
        { tag: '答', text: '现在是' + B + '多，多 ' + r + ' ' + u + it.n + '。' }
      ],
      key: 'over:' + a + ',' + b + ',' + n
    }
  }

  /* 变式②指定剩差求移动数：差从 d 缩到 r，要移 (d − r) 的一半，答 n */
  function genTarget(s) {
    var d0 = U.diff(s)
    var n = U.randInt(1, d0.moveMax)
    var r = U.randInt(1, Math.max(1, d0.moveMax))
    var d = 2 * n + r
    if (d0.numMax - d < 1) return null
    var b = U.randInt(1, d0.numMax - d) // 暗取一组数量，只用于验算文案
    var a = b + d
    var who = U.pickTwoNames()
    var it = U.pick(U.ITEMS)
    var A = who[0]
    var B = who[1]
    var u = it.u
    var half =
      '把 ' + (d - r) + ' 平分成两份：' + (d - r) + ' = ' + n + ' + ' + n + '，移一份就是 ' + n + ' ' + u +
      (s.difficulty === 'L1' ? '。' : '（也就是 ' + (d - r) + ' ÷ 2 = ' + n + '）。')
    return {
      topic: 'yiduobushao2',
      variant: 'target',
      stem:
        A + '比' + B + '多 ' + d + ' ' + u + it.n + '。' + A + '给' + B + '几' + u + it.n +
        '以后，' + A + '还比' + B + '多 ' + r + ' ' + u + '？',
      answer: n,
      unit: u,
      ansLabel: '答：' + A + '给' + B,
      ansSuffix: ' ' + u + it.n + '。',
      solution: [
        { tag: '想一想', text: '差距要从 ' + d + ' ' + u + '缩到 ' + r + ' ' + u + '；' + A + '每给 1 ' + u + '，差距缩小 2 ' + u + '。' },
        { tag: '第 1 步', text: '一共要缩小：' + d + ' − ' + r + ' = ' + (d - r) + '（' + u + '）。' },
        { tag: '第 2 步', text: half },
        { tag: '验一验', text: '假设' + A + '有 ' + a + ' ' + u + '、' + B + '有 ' + b + ' ' + u + '（相差 ' + d + '）；给 ' + n + ' ' + u + '后是 ' + (a - n) + ' ' + u + '和 ' + (b + n) + ' ' + u + '，还差 ' + r + ' ' + u + ' ✓' },
        { tag: '答', text: A + '给' + B + ' ' + n + ' ' + u + it.n + '。' }
      ],
      key: 'target:' + d + ',' + r
    }
  }

  /* 变式③知总数与移动数倒推原数：一样多时各分一半 h，A 原来 = h + n */
  function genTotal(s) {
    var d0 = U.diff(s)
    var n = U.randInt(1, d0.moveMax)
    var hMax = Math.floor(d0.numMax / 2)
    if (hMax < n + 1) return null
    var h = U.randInt(n + 1, hMax) // B 原来 = h − n ≥ 1
    var sSum = 2 * h
    var a = h + n
    var who = U.pickTwoNames()
    var it = U.pick(U.ITEMS)
    var A = who[0]
    var B = who[1]
    var u = it.u
    var halfText =
      '两人一样多，每人正好是总数的一半：' + sSum + ' = ' + h + ' + ' + h + '，每人 ' + h + ' ' + u +
      (s.difficulty === 'L1' ? '。' : '（也就是 ' + sSum + ' ÷ 2 = ' + h + '）。')
    return {
      topic: 'yiduobushao2',
      variant: 'total',
      stem:
        A + '和' + B + '一共有 ' + sSum + ' ' + u + it.n + '。' + A + '给了' + B + ' ' + n + ' ' + u +
        it.n + '以后，两人正好一样多。原来' + A + '有几' + u + it.n + '？',
      answer: a,
      unit: u,
      ansLabel: '答：原来' + A + '有',
      ansSuffix: ' ' + u + it.n + '。',
      solution: [
        { tag: '想一想', text: '不管怎么给，两人的' + it.n + '加起来总是 ' + sSum + ' ' + u + '，总数不变！' },
        { tag: '第 1 步', text: halfText },
        { tag: '第 2 步', text: A + '是给出 ' + n + ' ' + u + '才变成 ' + h + ' ' + u + '的，原来有：' + h + ' + ' + n + ' = ' + a + '（' + u + '）。' },
        { tag: '验一验', text: '原来' + A + ' ' + a + ' ' + u + '、' + B + ' ' + (h - n) + ' ' + u + '，合起来 ' + sSum + ' ' + u + '；' + A + '给 ' + n + ' ' + u + '后两人都是 ' + h + ' ' + u + ' ✓' },
        { tag: '答', text: '原来' + A + '有 ' + a + ' ' + u + it.n + '。' }
      ],
      key: 'total:' + sSum + ',' + n
    }
  }

  var YIDUOBUSHAO2 = {
    id: 'yiduobushao2',
    no: '04',
    stage: 'L1',
    name: '移多补少（提高篇）',
    lesson: {
      title: '移多补少（提高篇）· 方法讲解',
      sections: [
        {
          heading: '这是什么问题？',
          paras: ['基础篇里我们学过：把差的一半移过去，两人正好一样多。提高篇要多想一层：移多了会反超、想留一点差该移几个、知道总数怎么倒推原来各有多少。']
        },
        {
          heading: '怎么想？',
          paras: ['牢牢记住两条：① 每移 1 个，差距缩小 2 个；② 不管怎么移，两人的总数永远不变。所有提高题都从这两条出发。'],
          diagram: gapDiagram('小明', '小红', 6, 4, '差 4 颗：移 2 颗正好补平；要是移 3 颗，就反超 2 颗')
        },
        {
          heading: '例题示范',
          example: {
            stem: '小明有 12 颗糖，小红有 8 颗糖。小明给了小红 3 颗，现在谁的糖多？多几颗？',
            solution: [
              { tag: '想一想', text: '给 3 颗，差距缩小 3 + 3 = 6 颗——比原来的差距还大，会反超！' },
              { tag: '第 1 步', text: '原来多多少：12 − 8 = 4（颗）。' },
              { tag: '第 2 步', text: '差距缩小了 6 颗：6 − 4 = 2（颗），反超 2 颗。' },
              { tag: '验一验', text: '小明 12 − 3 = 9（颗），小红 8 + 3 = 11（颗），小红多 2 颗 ✓' },
              { tag: '答', text: '现在是小红多，多 2 颗糖。' }
            ]
          }
        },
        { heading: '记住口诀', chant: '每移一个缩小二，总数永远不会变；移超一半就反超，先算再移不慌乱。' }
      ]
    },
    variants: [
      { id: 'over', setting: 'vYd2Over', label: '移过头了，谁反超几个', gen: genOver },
      { id: 'target', setting: 'vYd2Target', label: '还想多 r 个，移几个', gen: genTarget },
      { id: 'total', setting: 'vYd2Total', label: '知总数，倒推原来各有几个', def: false, gen: genTotal }
    ],
    generate: function (s) {
      return U.generateFrom(YIDUOBUSHAO2.variants, s)
    },
    titleFor: function (s) {
      return '移多补少提高练习 · ' + U.diff(s).numMax + '以内'
    }
  }

  root.SumSum.aoshu.topics.yiduobushao2 = YIDUOBUSHAO2
  root.SumSum.aoshu.topicList.push(YIDUOBUSHAO2)
})(typeof window !== 'undefined' ? window : globalThis)
