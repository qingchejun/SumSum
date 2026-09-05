/**
 * 知识点「05 巧填算符」：在 ○ 里填 + 或 −，让等式成立。
 * 核心正确性约束：生成器枚举全部算符组合，恰好一个解才出题（多解/无解丢弃重出）。
 * 变式：①填一个算符 ②填两个算符 ③填三个算符（稍难默认关）。
 */
(function (root) {
  'use strict'

  var U = root.SumSum.aoshu.util

  /* 参与数字的上限（结果仍受 diff(s).numMax 约束） */
  var NUM_MAX = { L1: 9, L2: 20, L3: 30 }

  function numMax(s) {
    return NUM_MAX[s.difficulty] || NUM_MAX.L1
  }

  /* 从左往右求值（只有 +−，无优先级问题）；中间出现负数返回 null */
  function evalSteps(nums, ops) {
    var v = nums[0]
    var vals = []
    for (var i = 0; i < ops.length; i++) {
      v = ops[i] === '+' ? v + nums[i + 1] : v - nums[i + 1]
      if (v < 0) return null
      vals.push(v)
    }
    return { vals: vals, final: v }
  }

  /* 长度为 n 的全部 +− 组合（固定顺序，解析「试一试」按此顺序讲） */
  function combos(n) {
    var out = []
    for (var m = 0; m < 1 << n; m++) {
      var ops = []
      for (var i = 0; i < n; i++) ops.push(m & (1 << i) ? '−' : '+')
      out.push(ops)
    }
    return out
  }

  /* 把「6 − 3 + 2」拼成字符串 */
  function exprText(nums, ops) {
    var parts = [nums[0]]
    ops.forEach(function (op, i) {
      parts.push(op)
      parts.push(nums[i + 1])
    })
    return parts.join(' ')
  }

  /* 目标值下恰好一个组合成立才算合法题（孩子会试所有组合，中间为负视为不通） */
  function uniqueSolution(nums, target) {
    var hit = null
    var count = 0
    combos(nums.length - 1).forEach(function (ops) {
      var r = evalSteps(nums, ops)
      if (r && r.final === target) {
        count++
        hit = ops
      }
    })
    return count === 1 ? hit : null
  }

  /* 变式①：a ○ b = c 填一个算符。b ≥ 1 保证 +− 结果不同，天然唯一 */
  function genOne(s) {
    var n = numMax(s)
    var cap = U.diff(s).numMax
    var op = U.pick(['+', '−'])
    var a = U.randInt(1, n)
    var b = U.randInt(1, n)
    if (op === '−' && a < b) {
      var t = a
      a = b
      b = t
    }
    var c = op === '+' ? a + b : a - b
    if (c > cap) return null
    if (!uniqueSolution([a, b], c)) return null
    var other = op === '+' ? '−' : '+'
    var otherResult = op === '+' ? a - b : a + b
    var bigger = c > a
    /* 另一个符号的排除说明：a < b 时减法「不够减」，不能写出负数算式 */
    var checkText =
      op === '+' && a < b
        ? '要是填 −：' + a + ' 比 ' + b + ' 小，不够减——只有 + 行。'
        : '要是填 ' + other + '：' + a + ' ' + other + ' ' + b + ' = ' + otherResult + '，不是 ' + c + '——只有 ' + op + ' 行。'
    return {
      topic: 'tianfu',
      variant: 'one',
      stem: '在 ○ 里填上 + 或 −：' + a + ' ○ ' + b + ' = ' + c,
      answer: op,
      unit: '',
      ansLabel: '答：○ 里填',
      ansSuffix: '。',
      workLabel: '算式',
      solution: [
        { tag: '想一想', text: '结果 ' + c + ' 比 ' + a + (bigger ? ' 大' : ' 小') + '——要变' + (bigger ? '大，先试加法' : '小，先试减法') + '。' },
        { tag: '试一试', text: a + ' ' + op + ' ' + b + ' = ' + c + ' ✓' },
        { tag: '验一验', text: checkText },
        { tag: '答', text: '○ 里填 ' + op + '。' }
      ],
      key: 'one:' + a + ',' + b + '=' + c
    }
  }

  /* 变式②③共用：k 个算符的组合题。试一试列 1~2 个真实的错误尝试再给正确解 */
  function genCombo(s, k, variant) {
    var n = numMax(s)
    var cap = U.diff(s).numMax
    var nums = []
    for (var i = 0; i <= k; i++) nums.push(U.randInt(1, n))
    var ops = U.pick(combos(k))
    var r = evalSteps(nums, ops)
    if (!r || r.final > cap) return null
    if (r.vals.some(function (v) { return v > cap })) return null
    var target = r.final
    var hit = uniqueSolution(nums, target)
    if (!hit) return null

    /* 错误尝试：按固定顺序挑最多 2 个「算得通但结果不对」的组合 */
    var wrong = []
    combos(k).forEach(function (o) {
      if (o.join('') === ops.join('')) return
      var w = evalSteps(nums, o)
      if (w && wrong.length < 2) {
        wrong.push('试 ' + exprText(nums, o) + ' = ' + w.final + '，不对')
      }
    })
    var tryText =
      (wrong.length ? wrong.join('；') + '；再试 ' : '试 ') +
      exprText(nums, ops) + ' = ' + target + ' ✓'

    /* 验一验：按顺序一步步再算一遍 */
    var checkParts = []
    var acc = nums[0]
    ops.forEach(function (op, i) {
      var next = op === '+' ? acc + nums[i + 1] : acc - nums[i + 1]
      checkParts.push(acc + ' ' + op + ' ' + nums[i + 1] + ' = ' + next)
      acc = next
    })
    var opsCn = ops.join('、')
    return {
      topic: 'tianfu',
      variant: variant,
      stem: '在 ○ 里填上 + 或 −：' + nums.join(' ○ ') + ' = ' + target,
      answer: ops.join('、'),
      unit: '',
      ansLabel: '答：○ 里从左到右填',
      ansSuffix: '。',
      workLabel: '算式',
      solution: [
        { tag: '想一想', text: '每个 ○ 都可能是 + 或 −，从左往右一个一个试，不对就换。' },
        { tag: '试一试', text: tryText },
        { tag: '验一验', text: '按顺序再算一遍：' + checkParts.join('，') + ' ✓' },
        { tag: '答', text: '从左到右填 ' + opsCn + '。' }
      ],
      key: variant + ':' + nums.join(',') + '=' + target
    }
  }

  function genTwo(s) {
    return genCombo(s, 2, 'two')
  }

  function genThree(s) {
    return genCombo(s, 3, 'three')
  }

  var TIANFU = {
    id: 'tianfu',
    no: '05',
    stage: 'L1',
    name: '巧填算符',
    lesson: {
      title: '巧填算符 · 方法讲解',
      sections: [
        {
          heading: '这是什么问题？',
          paras: ['算式里的运算符号藏进了 ○ 里，要自己填上 + 或 −，让等式成立。']
        },
        {
          heading: '怎么想？',
          paras: [
            '先看结果比开头的数大还是小：变大要用加，变小要用减。',
            '拿不准就从左往右一个一个试：算出来不对就换一个符号，直到等式成立。填完一定要完整地再算一遍。'
          ]
        },
        {
          heading: '例题示范',
          example: {
            stem: '在 ○ 里填上 + 或 −：9 ○ 4 ○ 2 = 7',
            solution: [
              { tag: '想一想', text: '结果 7 比 9 小，总体要变小，减号肯定少不了。' },
              { tag: '试一试', text: '试 9 − 4 − 2 = 3，太小了；再试 9 − 4 + 2 = 7 ✓' },
              { tag: '验一验', text: '按顺序再算一遍：9 − 4 = 5，5 + 2 = 7 ✓' },
              { tag: '答', text: '从左到右填 − 和 +。' }
            ]
          }
        },
        { heading: '记住口诀', chant: '比大小，定加减；一个一个试，填完再验算。' }
      ]
    },
    variants: [
      { id: 'one', setting: 'vTfOne', label: '填一个算符', gen: genOne },
      { id: 'two', setting: 'vTfTwo', label: '填两个算符', gen: genTwo },
      { id: 'three', setting: 'vTfThree', label: '填三个算符', def: false, gen: genThree }
    ],
    generate: function (s) {
      return U.generateFrom(TIANFU.variants, s)
    },
    titleFor: function (s) {
      return '巧填算符练习 · ' + U.DIFF_LABEL[s.difficulty]
    }
  }

  root.SumSum.aoshu.topics.tianfu = TIANFU
  root.SumSum.aoshu.topicList.push(TIANFU)
})(typeof window !== 'undefined' ? window : globalThis)
