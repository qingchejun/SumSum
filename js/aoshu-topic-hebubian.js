/**
 * 知识点「20 和不变与差不变」：抓住「什么没变」，很多题不用算就能答。
 * 变式：①和不变（给来给去总数不变）②差不变（一起增加差不变）③和的变化（稍难默认关）。
 */
(function (root) {
  'use strict'

  var U = root.SumSum.aoshu.util

  /* 变式①和不变：A 和 B 一共 s 个，A 给 B n 个，总数还是 s */
  function genSum(s0) {
    var d0 = U.diff(s0)
    var s = U.randInt(6, d0.numMax)
    var n = U.randInt(1, d0.moveMax)
    if (s - 1 < n) return null
    var a = U.randInt(n, s - 1) // 暗取一组数供验算：A 至少要有 n 个才给得出
    var b = s - a
    var who = U.pickTwoNames()
    var it = U.pick(U.ITEMS)
    var A = who[0]
    var B = who[1]
    var u = it.u
    return {
      topic: 'hebubian',
      variant: 'sum',
      stem:
        A + '和' + B + '一共有 ' + s + ' ' + u + it.n + '。' +
        A + '给了' + B + ' ' + n + ' ' + u + it.n + '，现在两人一共有几' + u + it.n + '？',
      answer: s,
      unit: u,
      ansLabel: '答：现在两人一共有',
      ansSuffix: u + it.n + '。',
      solution: [
        { tag: '想一想', text: it.n + '只是从' + A + '手里到了' + B + '手里，一' + u + '也没多、一' + u + '也没少。' },
        { tag: '小心陷阱', text: '看到「给了 ' + n + ' ' + u + '」别急着减！给来给去只是换了地方，总数不变。' },
        {
          tag: '验一验',
          text:
            '假设' + A + '原来有 ' + a + ' ' + u + '、' + B + '有 ' + b + ' ' + u + '（合起来正好 ' + s + '）；给完后是 ' +
            (a - n) + ' ' + u + '和 ' + (b + n) + ' ' + u + '，' + (a - n) + ' + ' + (b + n) + ' = ' + s + '，总数果然没变 ✓'
        },
        { tag: '答', text: '现在两人一共还是有 ' + s + ' ' + u + it.n + '。' }
      ],
      key: 'sum:' + s + ',' + n
    }
  }

  /* 变式②差不变：A 比 B 多 d 个，两人各得 n 个，差还是 d */
  function genDiff(s0) {
    var d0 = U.diff(s0)
    var n = U.randInt(1, d0.moveMax)
    if (d0.numMax - n - 2 < 1) return null
    var d = U.randInt(1, d0.numMax - n - 2)
    if (d0.numMax - d - n < 1) return null
    var b = U.randInt(1, d0.numMax - d - n) // 暗取供验算，保证各买 n 后都不超上限
    var a = b + d
    var who = U.pickTwoNames()
    var it = U.pick(U.ITEMS)
    var A = who[0]
    var B = who[1]
    var u = it.u
    return {
      topic: 'hebubian',
      variant: 'diff',
      stem:
        A + '比' + B + '多 ' + d + ' ' + u + it.n + '。两人又各买了 ' + n + ' ' + u + it.n + '，现在' +
        A + '比' + B + '多几' + u + it.n + '？',
      answer: d,
      unit: u,
      ansLabel: '答：现在' + A + '比' + B + '多',
      ansSuffix: u + it.n + '。',
      solution: [
        { tag: '想一想', text: '两人一起多了同样多——你追我也跑，差距一点没变。' },
        { tag: '小心陷阱', text: '「各买了 ' + n + ' ' + u + '」不用加来加去：一起增加同样多，相差还是原来那么多。' },
        {
          tag: '验一验',
          text:
            '假设' + A + '有 ' + a + ' ' + u + '、' + B + '有 ' + b + ' ' + u + '（相差 ' + d + '）；各买 ' + n + ' 后是 ' +
            (a + n) + ' ' + u + '和 ' + (b + n) + ' ' + u + '，' + (a + n) + ' − ' + (b + n) + ' = ' + d + ' ✓'
        },
        { tag: '答', text: '现在' + A + '还是比' + B + '多 ' + d + ' ' + u + it.n + '。' }
      ],
      key: 'diff:' + d + ',' + n
    }
  }

  /* 变式③和的变化：两人分别得到（或一得一用），总数跟着变多少 */
  function genChange(s0) {
    var d0 = U.diff(s0)
    var both = Math.random() < 0.5
    var who = U.pickTwoNames()
    var it = U.pick(U.ITEMS)
    var A = who[0]
    var B = who[1]
    var u = it.u
    if (both) {
      var x = U.randInt(1, 9)
      var y = U.randInt(1, 9)
      if (d0.numMax - x - y < 4) return null
      var s = U.randInt(4, d0.numMax - x - y)
      var a = U.randInt(1, s - 1)
      var b = s - a
      var ans = s + x + y
      return {
        topic: 'hebubian',
        variant: 'change',
        stem:
          A + '和' + B + '一共有 ' + s + ' ' + u + it.n + '。' + A + '又得到 ' + x + ' ' + u + '，' +
          B + '又得到 ' + y + ' ' + u + '，现在一共有几' + u + it.n + '？',
        answer: ans,
        unit: u,
        ansLabel: '答：现在一共有',
        ansSuffix: u + it.n + '。',
        solution: [
          { tag: '想一想', text: '这回总数变了：两人都得到了新的，总数一共多了多少？' },
          { tag: '列算式', text: '多了 ' + x + ' + ' + y + ' = ' + (x + y) + '（' + u + '），' + s + ' + ' + (x + y) + ' = ' + ans + '（' + u + '）。' },
          {
            tag: '验一验',
            text:
              '假设' + A + '原来有 ' + a + ' ' + u + '、' + B + '有 ' + b + ' ' + u + '；现在是 ' + (a + x) + ' ' + u + '和 ' +
              (b + y) + ' ' + u + '，' + (a + x) + ' + ' + (b + y) + ' = ' + ans + ' ✓'
          },
          { tag: '答', text: '现在一共有 ' + ans + ' ' + u + it.n + '。' }
        ],
        key: 'change:both:' + s + ',' + x + ',' + y
      }
    }
    var x2 = U.randInt(1, 9)
    var y2 = U.randInt(1, 9)
    if (d0.numMax - x2 - 2 < y2 + 1) return null
    var b2 = U.randInt(y2, Math.min(y2 + 15, d0.numMax - x2 - 2))
    var a2 = U.randInt(1, d0.numMax - x2 - b2)
    var s2 = a2 + b2
    var ans2 = s2 + x2 - y2
    var netText
    if (x2 > y2) {
      netText = '多了 ' + x2 + '、少了 ' + y2 + '，总数多了 ' + x2 + ' − ' + y2 + ' = ' + (x2 - y2) + '（' + u + '）：' + s2 + ' + ' + (x2 - y2) + ' = ' + ans2 + '（' + u + '）。'
    } else if (x2 < y2) {
      netText = '多了 ' + x2 + '、少了 ' + y2 + '，总数少了 ' + y2 + ' − ' + x2 + ' = ' + (y2 - x2) + '（' + u + '）：' + s2 + ' − ' + (y2 - x2) + ' = ' + ans2 + '（' + u + '）。'
    } else {
      netText = '多的和少的一样多（都是 ' + x2 + ' ' + u + '），正好抵消——总数还是 ' + s2 + ' ' + u + '。'
    }
    return {
      topic: 'hebubian',
      variant: 'change',
      stem:
        A + '和' + B + '一共有 ' + s2 + ' ' + u + it.n + '。' + A + '又得到 ' + x2 + ' ' + u + '，' +
        B + '用掉了 ' + y2 + ' ' + u + '，现在一共有几' + u + it.n + '？',
      answer: ans2,
      unit: u,
      ansLabel: '答：现在一共有',
      ansSuffix: u + it.n + '。',
      solution: [
        { tag: '想一想', text: '一边在多、一边在少，先看看多了多少、少了多少。' },
        { tag: '列算式', text: netText },
        {
          tag: '验一验',
          text:
            '假设' + A + '原来有 ' + a2 + ' ' + u + '、' + B + '有 ' + b2 + ' ' + u + '；现在是 ' + (a2 + x2) + ' ' + u + '和 ' +
            (b2 - y2) + ' ' + u + '，' + (a2 + x2) + ' + ' + (b2 - y2) + ' = ' + ans2 + ' ✓'
        },
        { tag: '答', text: '现在一共有 ' + ans2 + ' ' + u + it.n + '。' }
      ],
      key: 'change:mix:' + s2 + ',' + x2 + ',' + y2
    }
  }

  var HEBUBIAN = {
    id: 'hebubian',
    no: '20',
    stage: 'L1',
    name: '和不变与差不变',
    lesson: {
      title: '和不变与差不变 · 方法讲解',
      sections: [
        {
          heading: '这是什么问题？',
          paras: ['东西给来给去、两人一起买一起用……到底什么变了、什么没变？很多题看着要算，其实抓住「不变」就能一眼说出答案。']
        },
        {
          heading: '怎么想？',
          paras: [
            '给来给去（你给我、我给你）：东西只是换了地方，总数不变。',
            '一起增加（或一起减少）同样多：你追我也跑，两人的差不变。',
            '做题先问自己两句：总数变了吗？差变了吗？没变的直接写答案，变了的再动笔算。'
          ]
        },
        {
          heading: '例题示范',
          example: {
            stem: '小明和小红一共有 12 颗糖。小明给了小红 3 颗，现在两人一共有几颗糖？',
            solution: [
              { tag: '想一想', text: '糖只是从小明手里到了小红手里，一颗也没多、一颗也没少。' },
              { tag: '小心陷阱', text: '看到「给了 3 颗」别急着减！总数不变。' },
              { tag: '验一验', text: '假设小明有 7 颗、小红有 5 颗（合起来 12）；给完后是 4 颗和 8 颗，4 + 8 = 12，果然没变 ✓' },
              { tag: '答', text: '现在两人一共还是有 12 颗糖。' }
            ]
          }
        },
        { heading: '记住口诀', chant: '给来又给去，总数不变心里记；一起多一起少，相差不变不用急。' }
      ]
    },
    variants: [
      { id: 'sum', setting: 'vHbSum', label: '和不变（给来给去）', gen: genSum },
      { id: 'diff', setting: 'vHbDiff', label: '差不变（一起增加）', gen: genDiff },
      { id: 'change', setting: 'vHbChange', label: '和的变化（一多一少）', def: false, gen: genChange }
    ],
    generate: function (s) {
      return U.generateFrom(HEBUBIAN.variants, s)
    },
    titleFor: function (s) {
      return '和不变与差不变练习 · ' + U.diff(s).numMax + '以内'
    }
  }

  root.SumSum.aoshu.topics.hebubian = HEBUBIAN
  root.SumSum.aoshu.topicList.push(HEBUBIAN)
})(typeof window !== 'undefined' ? window : globalThis)
