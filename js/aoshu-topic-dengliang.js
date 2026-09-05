/**
 * 知识点「10 等量代换」：一样重（一样多）的东西可以互相替换。
 * 变式：①一步代换（大的换小的）②两步代换（一层一层换）③符号代换（○△ 求值）。
 */
(function (root) {
  'use strict'

  var U = root.SumSum.aoshu.util

  /* 一步代换的物品对：1 个 big 和 rate 个 small 一样重 */
  var PAIRS = [
    { big: '西瓜', small: '苹果', u: '个' },
    { big: '菠萝', small: '橘子', u: '个' },
    { big: '冬瓜', small: '萝卜', u: '个' },
    { big: '大书包', small: '文具盒', u: '个' },
    { big: '大南瓜', small: '土豆', u: '个' }
  ]

  /* 两步代换的物品链：1 个 a = p 个 b，1 个 b = q 个 c */
  var CHAINS = [
    { a: '猫', b: '兔', c: '鸡', u: '只' },
    { a: '西瓜', b: '菠萝', c: '苹果', u: '个' },
    { a: '大瓶水', b: '中瓶水', c: '小瓶水', u: '瓶' }
  ]

  /* 连加算式文案：k 个 rate 连加（如「3 + 3 = 6」），L2/L3 括号补乘法 */
  function addChain(rate, k, total, u, difficulty) {
    var parts = []
    for (var i = 0; i < k; i++) parts.push(rate)
    return (
      parts.join(' + ') + ' = ' + total + '（' + u + '）' +
      (difficulty === 'L1' ? '。' : '（也就是 ' + rate + ' × ' + k + ' = ' + total + '）。')
    )
  }

  /* 变式①一步代换：m 个大物 = m × rate 个小物 */
  function genOne(s) {
    var d0 = U.diff(s)
    var rate = s.difficulty === 'L1' ? U.randInt(2, 4) : U.randInt(2, 6)
    var m = s.difficulty === 'L1' ? U.randInt(2, 3) : U.randInt(2, 4)
    var ans = rate * m
    if (ans > Math.min(d0.numMax, 24)) return null
    var p = U.pick(PAIRS)
    return {
      topic: 'dengliang',
      variant: 'one',
      stem:
        '1 ' + p.u + p.big + '和 ' + rate + ' ' + p.u + p.small + '一样重。' +
        m + ' ' + p.u + p.big + '和几' + p.u + p.small + '一样重？',
      answer: ans,
      unit: p.u,
      ansLabel: '答：' + m + ' ' + p.u + p.big + '和',
      ansSuffix: ' ' + p.u + p.small + '一样重。',
      solution: [
        { tag: '想一想', text: '1 ' + p.u + p.big + '能换 ' + rate + ' ' + p.u + p.small + '，那就把每' + p.u + p.big + '都换成' + p.small + '。' },
        { tag: '列算式', text: '换 ' + m + ' 次：' + addChain(rate, m, ans, p.u, s.difficulty) },
        { tag: '验一验', text: '一个一个换：第 1 ' + p.u + '换 ' + rate + ' ' + p.u + '，第 2 ' + p.u + '再换 ' + rate + ' ' + p.u + (m > 2 ? '……' : '，') + '数一数正好 ' + ans + ' ' + p.u + ' ✓' },
        { tag: '答', text: m + ' ' + p.u + p.big + '和 ' + ans + ' ' + p.u + p.small + '一样重。' }
      ],
      key: 'one:' + rate + ',' + m
    }
  }

  /* 变式②两步代换：1a = p 个 b，1b = q 个 c → 1a = p×q 个 c */
  function genTwo(s) {
    var d0 = U.diff(s)
    var p = U.randInt(2, 3)
    var q = s.difficulty === 'L1' ? U.randInt(2, 3) : U.randInt(2, 4)
    var ans = p * q
    if (ans > Math.min(d0.numMax, 12)) return null
    var c = U.pick(CHAINS)
    return {
      topic: 'dengliang',
      variant: 'two',
      stem:
        '1 ' + c.u + c.a + '和 ' + p + ' ' + c.u + c.b + '一样重，1 ' + c.u + c.b + '和 ' + q + ' ' + c.u + c.c + '一样重。' +
        '1 ' + c.u + c.a + '和几' + c.u + c.c + '一样重？',
      answer: ans,
      unit: c.u,
      ansLabel: '答：1 ' + c.u + c.a + '和',
      ansSuffix: ' ' + c.u + c.c + '一样重。',
      solution: [
        { tag: '想一想', text: '一层一层换：先把' + c.a + '换成' + c.b + '，再把每' + c.u + c.b + '换成' + c.c + '。' },
        { tag: '第 1 步', text: '1 ' + c.u + c.a + ' = ' + p + ' ' + c.u + c.b + '。' },
        { tag: '第 2 步', text: '每' + c.u + c.b + '换 ' + q + ' ' + c.u + c.c + '：' + addChain(q, p, ans, c.u, s.difficulty) },
        { tag: '验一验', text: '数一数：' + p + ' ' + c.u + c.b + '，每' + c.u + '变 ' + q + ' ' + c.u + c.c + '，一共 ' + ans + ' ' + c.u + ' ✓' },
        { tag: '答', text: '1 ' + c.u + c.a + '和 ' + ans + ' ' + c.u + c.c + '一样重。' }
      ],
      key: 'two:' + p + ',' + q
    }
  }

  /* 变式③符号代换：○+○=S 求 ○，再由 ○+△=T 求 △ */
  function genSymbol(s) {
    var d0 = U.diff(s)
    var k1 = U.randInt(2, Math.floor(d0.numMax / 2))
    var sum1 = 2 * k1
    if (d0.numMax - k1 < 2) return null
    var k2 = U.randInt(1, d0.numMax - k1)
    var sum2 = k1 + k2
    var halfText =
      '○ + ○ = ' + sum1 + '，两个 ○ 一样大，把 ' + sum1 + ' 平分成两份：○ = ' + k1 +
      (s.difficulty === 'L1' ? '。' : '（也就是 ' + sum1 + ' ÷ 2 = ' + k1 + '）。')
    return {
      topic: 'dengliang',
      variant: 'symbol',
      stem: '○ + ○ = ' + sum1 + '，○ + △ = ' + sum2 + '。△ 等于几？',
      answer: k2,
      unit: '',
      ansLabel: '答：△ =',
      ansSuffix: '。',
      workLabel: '算式',
      solution: [
        { tag: '想一想', text: '第一条算式里只有 ○，先从它下手求出 ○ 是几。' },
        { tag: '第 1 步', text: halfText },
        { tag: '第 2 步', text: '把 ○ = ' + k1 + ' 换进第二条：' + k1 + ' + △ = ' + sum2 + '，△ = ' + sum2 + ' − ' + k1 + ' = ' + k2 + '。' },
        { tag: '验一验', text: '代回去查：' + k1 + ' + ' + k1 + ' = ' + sum1 + ' ✓，' + k1 + ' + ' + k2 + ' = ' + sum2 + ' ✓' },
        { tag: '答', text: '△ = ' + k2 + '。' }
      ],
      key: 'symbol:' + k1 + ',' + k2
    }
  }

  var DENGLIANG = {
    id: 'dengliang',
    no: '10',
    stage: 'L1',
    name: '等量代换',
    lesson: {
      title: '等量代换 · 方法讲解',
      sections: [
        {
          heading: '这是什么问题？',
          paras: ['两样东西一样重（或一样多）时，就可以互相替换——这就是「等量代换」，是以后学方程的底子。']
        },
        {
          heading: '怎么想？',
          paras: [
            '抓住关键的一句话：「1 个大的能换几个小的」。要求几个大的，就把它们一个一个都换成小的，再数总数。',
            '遇到两层关系（猫换兔、兔换鸡），别急，一层一层换，先换成中间的，再换成最小的。'
          ]
        },
        {
          heading: '例题示范',
          example: {
            stem: '1 个西瓜和 3 个苹果一样重。2 个西瓜和几个苹果一样重？',
            solution: [
              { tag: '想一想', text: '1 个西瓜能换 3 个苹果，那就把每个西瓜都换成苹果。' },
              { tag: '列算式', text: '换 2 次：3 + 3 = 6（个）。' },
              { tag: '验一验', text: '一个一个换：第 1 个西瓜换 3 个苹果，第 2 个再换 3 个，数一数正好 6 个 ✓' },
              { tag: '答', text: '2 个西瓜和 6 个苹果一样重。' }
            ]
          }
        },
        { heading: '记住口诀', chant: '一个换几个，先要看清楚；大的换小的，一层一层换。' }
      ]
    },
    variants: [
      { id: 'one', setting: 'vDlOne', label: '一步代换（大的换小的）', gen: genOne },
      { id: 'two', setting: 'vDlTwo', label: '两步代换（一层一层换）', gen: genTwo },
      { id: 'symbol', setting: 'vDlSymbol', label: '符号代换（○△ 求值）', gen: genSymbol }
    ],
    generate: function (s) {
      return U.generateFrom(DENGLIANG.variants, s)
    },
    titleFor: function (s) {
      return '等量代换练习 · ' + U.DIFF_LABEL[s.difficulty]
    }
  }

  root.SumSum.aoshu.topics.dengliang = DENGLIANG
  root.SumSum.aoshu.topicList.push(DENGLIANG)
})(typeof window !== 'undefined' ? window : globalThis)
