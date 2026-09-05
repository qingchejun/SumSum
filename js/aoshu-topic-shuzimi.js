/**
 * 知识点「06 数字谜问题（基础篇）」：□ ○ △ 里藏着数，根据算式把它们找出来。
 * 同一个符号藏同一个数。全部反向构造（先定答案再出题），解天然唯一；
 * 解析推导绝不引用被问的值——枚举「试一试」列出的每一步都是真算过的。
 * 变式：①相同的数 ②连环求解 ③和与差（稍难默认关）。
 */
(function (root) {
  'use strict'

  var U = root.SumSum.aoshu.util

  /* 各难度档参与数字的上限（和仍受 diff(s).numMax 约束） */
  var NUM_MAX = { L1: 9, L2: 20, L3: 40 }

  function numMax(s) {
    return NUM_MAX[s.difficulty] || NUM_MAX.L1
  }

  /* 变式①「相同的数」：n 个相同的 □ 相加，n ∈ {2, 3} */
  function genSame(s) {
    var cap = U.diff(s).numMax
    var n = U.pick([2, 3])
    var kTop = Math.min(Math.floor(cap / n), numMax(s))
    if (kTop < 2) return null
    var k = U.randInt(2, kTop)
    var total = n * k
    var words = n === 2 ? '两个' : '三个'
    var solution
    if (n === 2) {
      solution = [
        { tag: '想一想', text: '两个相同的数加起来是 ' + total + '——就是把 ' + total + ' 分成两份一样多。' },
        { tag: '试一试', text: total + ' = ' + k + ' + ' + k + '，每份是 ' + k + '。' },
        { tag: '验一验', text: k + ' + ' + k + ' = ' + total + ' ✓' },
        { tag: '答', text: '□ 是 ' + k + '。' }
      ]
    } else {
      var less = k - 1
      solution = [
        { tag: '想一想', text: '三个相同的数加起来是 ' + total + '，从小一个一个试。' },
        { tag: '试一试', text: less + ' + ' + less + ' + ' + less + ' = ' + less * 3 + '，不够；' + k + ' + ' + k + ' + ' + k + ' = ' + total + ' ✓' },
        { tag: '验一验', text: '再大一个就超了：' + (k + 1) + ' + ' + (k + 1) + ' + ' + (k + 1) + ' = ' + (k + 1) * 3 + '——只有 ' + k + ' 正好。' },
        { tag: '答', text: '□ 是 ' + k + '。' }
      ]
    }
    var expr = []
    for (var i = 0; i < n; i++) expr.push('□')
    return {
      topic: 'shuzimi',
      variant: 'same',
      stem: expr.join(' + ') + ' = ' + total + '，' + words + ' □ 是同一个数。□ 是几？',
      answer: k,
      unit: '',
      ansLabel: '答：□ 是',
      ansSuffix: '。',
      solution: solution,
      key: 'same:' + n + ',' + total
    }
  }

  /* 变式②「连环求解」：○ + b = s1，○ + △ = s2，求 △。先解数字全的一条 */
  function genChain(s) {
    var cap = U.diff(s).numMax
    var n = numMax(s)
    var o = U.randInt(1, n)
    if (cap - o < 2) return null
    var b = U.randInt(1, Math.min(n, cap - o))
    var d = U.randInt(1, Math.min(n, cap - o))
    if (d === b) return null // △ 恰好等于 b 时两条算式长得一样，题目失去「连环」味道
    var s1 = o + b
    var s2 = o + d
    return {
      topic: 'shuzimi',
      variant: 'chain',
      stem: '○ + ' + b + ' = ' + s1 + '，○ + △ = ' + s2 + '。△ 是几？',
      answer: d,
      unit: '',
      ansLabel: '答：△ 是',
      ansSuffix: '。',
      solution: [
        { tag: '想一想', text: '两条算式里的 ○ 是同一个数。先从数字全的第一条求出 ○。' },
        { tag: '第 1 步', text: '○ + ' + b + ' = ' + s1 + '，想「几加 ' + b + ' 得 ' + s1 + '」：○ = ' + s1 + ' − ' + b + ' = ' + o + '。' },
        { tag: '第 2 步', text: '把 ○ = ' + o + ' 带进第二条：' + o + ' + △ = ' + s2 + '，△ = ' + s2 + ' − ' + o + ' = ' + d + '。' },
        { tag: '验一验', text: '代回去：' + o + ' + ' + b + ' = ' + s1 + ' ✓，' + o + ' + ' + d + ' = ' + s2 + ' ✓' },
        { tag: '答', text: '△ 是 ' + d + '。' }
      ],
      key: 'chain:' + o + ',' + b + ',' + d
    }
  }

  /* 变式③「和与差」：△ + ○ = 和，△ − ○ = 差。用一年级枚举法：
     把相差 d 的数对从小试起。构造时保证 ○ ≤ 3，试一试最多列 3 步 */
  function genPair(s) {
    var cap = U.diff(s).numMax
    var p = U.randInt(1, 3) // ○ 的值，≤3 保证枚举短
    var d = U.randInt(1, numMax(s))
    var sum = 2 * p + d
    if (sum > cap) return null
    var tries = []
    for (var i = 1; i <= p; i++) {
      var pairSum = 2 * i + d
      tries.push(
        '○ 是 ' + i + '、△ 是 ' + (i + d) + '：' + i + ' + ' + (i + d) + ' = ' + pairSum +
        (i === p ? ' ✓' : '，不对')
      )
    }
    var big = p + d
    return {
      topic: 'shuzimi',
      variant: 'pair',
      stem: '△ + ○ = ' + sum + '，△ − ○ = ' + d + '。△ 是几？',
      answer: big,
      unit: '',
      ansLabel: '答：△ 是',
      ansSuffix: '。',
      solution: [
        { tag: '想一想', text: '△ − ○ = ' + d + ' 说明 △ 比 ○ 大 ' + d + '。把相差 ' + d + ' 的数对从小开始试，看哪一对加起来是 ' + sum + '。' },
        { tag: '试一试', text: tries.join('；') },
        { tag: '验一验', text: big + ' + ' + p + ' = ' + sum + ' ✓，' + big + ' − ' + p + ' = ' + d + ' ✓' },
        { tag: '答', text: '△ 是 ' + big + '（○ 是 ' + p + '）。' }
      ],
      key: 'pair:' + p + ',' + d
    }
  }

  var SHUZIMI = {
    id: 'shuzimi',
    no: '06',
    stage: 'L1',
    name: '数字谜问题（基础篇）',
    lesson: {
      title: '数字谜（基础）· 方法讲解',
      sections: [
        {
          heading: '这是什么问题？',
          paras: ['算式里有的数藏进了 □ ○ △ 里。同一个符号藏的是同一个数，要把它们一个个找出来。']
        },
        {
          heading: '怎么想？',
          paras: [
            '第一招：想加算减。○ + 3 = 10，就想「几加 3 得 10」，用 10 − 3 = 7 算出来。',
            '第二招：先解数字最全的那条算式，求出一个符号，再带着它去解下一条。最后一定把答案代回原式验一验。'
          ]
        },
        {
          heading: '例题示范',
          example: {
            stem: '○ + 4 = 9，○ + △ = 11。△ 是几？',
            solution: [
              { tag: '想一想', text: '两条算式里的 ○ 是同一个数，先从数字全的第一条下手。' },
              { tag: '第 1 步', text: '○ + 4 = 9，想「几加 4 得 9」：○ = 9 − 4 = 5。' },
              { tag: '第 2 步', text: '把 ○ = 5 带进第二条：5 + △ = 11，△ = 11 − 5 = 6。' },
              { tag: '验一验', text: '代回去：5 + 4 = 9 ✓，5 + 6 = 11 ✓' },
              { tag: '答', text: '△ 是 6。' }
            ]
          }
        },
        { heading: '记住口诀', chant: '想加就算减，先解数字全；求一个带一个，代回验一验。' }
      ]
    },
    variants: [
      { id: 'same', setting: 'vSmSame', label: '相同的数（□+□=？）', gen: genSame },
      { id: 'chain', setting: 'vSmChain', label: '连环求解（先求○再求△）', gen: genChain },
      { id: 'pair', setting: 'vSmPair', label: '和与差（从小试数对）', def: false, gen: genPair }
    ],
    generate: function (s) {
      return U.generateFrom(SHUZIMI.variants, s)
    },
    titleFor: function (s) {
      return '数字谜练习（基础）· ' + U.DIFF_LABEL[s.difficulty]
    }
  }

  root.SumSum.aoshu.topics.shuzimi = SHUZIMI
  root.SumSum.aoshu.topicList.push(SHUZIMI)
})(typeof window !== 'undefined' ? window : globalThis)
