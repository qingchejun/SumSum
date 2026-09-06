/**
 * 知识点「21 加减法文字谜」（L2）：算式里的汉字当未知数。
 * 约定：相同的字代表相同的数，不同的字代表不同的数。
 * 变式：①同字谜（平分/想口诀）②和差谜（和加差得两倍大数）③三字连环（三条相加各字出现两次，稍难默认关）。
 * 全部反向构造：先定各字的值再拼算式，答案天然唯一。
 */
(function (root) {
  'use strict'

  var U = root.SumSum.aoshu.util

  var CHARS = ['学', '数', '好', '乐', '爱', '日', '月', '山', '水', '田', '禾', '火']

  /* 随机抽 n 个互不相同的字 */
  function pickChars(n) {
    var pool = CHARS.slice()
    var out = []
    for (var i = 0; i < n; i++) {
      out.push(pool.splice(U.randInt(0, pool.length - 1), 1)[0])
    }
    return out
  }

  /* 变式①同字谜：n 个相同的字相加（n=2 教平分，n=3 教「想口诀」） */
  function genSame(s) {
    var cap = U.diff(s).numMax
    var ch = pickChars(1)[0]
    var n = U.pick([2, 2, 3]) // 两个同字为主，三个偶尔出现
    var k
    var sum
    if (n === 2) {
      k = U.randInt(2, Math.floor(cap / 2))
      sum = 2 * k
    } else {
      var kmax = Math.min(9, Math.floor(cap / 3)) // 三同字限在口诀范围内
      if (kmax < 2) return null
      k = U.randInt(2, kmax)
      sum = 3 * k
    }
    var solution = [
      { tag: '想一想', text: '「' + ch + '」都是同一个数：' + n + ' 个一样的数合起来是 ' + sum + '。' }
    ]
    if (n === 2) {
      solution.push({ tag: '算一算', text: '把 ' + sum + ' 平分成两份，每份是 ' + k + '，所以 ' + ch + ' = ' + k + '。' })
      solution.push({ tag: '验一验', text: k + ' + ' + k + ' = ' + sum + ' ✓' })
    } else {
      solution.push({ tag: '算一算', text: '把 ' + sum + ' 平均分成 3 份：' + sum + ' = ' + k + ' + ' + k + ' + ' + k + '，每份是 ' + k + '（口诀 3 × ' + k + ' = ' + sum + '）。' })
      solution.push({ tag: '验一验', text: k + ' + ' + k + ' + ' + k + ' = ' + sum + ' ✓' })
    }
    solution.push({ tag: '答', text: ch + ' = ' + k + '。' })
    var lhs = []
    for (var i = 0; i < n; i++) lhs.push(ch)
    return {
      topic: 'wenzimi',
      variant: 'same',
      stem: lhs.join(' + ') + ' = ' + sum + '。「' + ch + '」是几？',
      answer: k,
      unit: '',
      ansLabel: '答：' + ch + ' =',
      ansSuffix: '。',
      solution: solution,
      key: 'same:' + n + ':' + k
    }
  }

  /* 变式②和差谜：A+B=和、A−B=差，求两个字（教「和加差得两个大数」） */
  function genPair(s) {
    var cap = U.diff(s).numMax
    var d = U.randInt(1, Math.min(9, Math.max(2, Math.floor(cap / 4))))
    if (Math.floor((cap - d) / 2) < 1) return null
    var p = U.randInt(1, Math.floor((cap - d) / 2)) // 小数（B 的值）
    var big = p + d
    var sum = big + p
    var cs = pickChars(2)
    var A = cs[0]
    var B = cs[1]
    return {
      topic: 'wenzimi',
      variant: 'pair',
      stem: A + ' + ' + B + ' = ' + sum + '，' + A + ' − ' + B + ' = ' + d + '。「' + A + '」和「' + B + '」各是几？',
      answer: big,
      unit: '',
      ansLabel: '答：' + A + ' =',
      ansSuffix: '，' + B + ' =＿＿。',
      solution: [
        { tag: '想一想', text: '和是 ' + sum + '：一个大数（' + A + '）加一个小数（' + B + '）；差是 ' + d + '：' + A + ' 比 ' + B + ' 多 ' + d + '。' },
        { tag: '第 1 步', text: '和加上差：' + sum + ' + ' + d + ' = ' + (sum + d) + '——把「' + B + '」补成「' + A + '」，' + (sum + d) + ' 正好是两个「' + A + '」，平分得 ' + A + ' = ' + big + '。' },
        { tag: '第 2 步', text: B + ' = ' + sum + ' − ' + big + ' = ' + p + '。' },
        { tag: '验一验', text: big + ' + ' + p + ' = ' + sum + ' ✓，' + big + ' − ' + p + ' = ' + d + ' ✓' },
        { tag: '答', text: A + ' = ' + big + '，' + B + ' = ' + p + '。' }
      ],
      key: 'pair:' + sum + ',' + d
    }
  }

  /* 变式③三字连环：三条两两相加的算式，求其中一个字（稍难默认关） */
  function genChain(s) {
    var cap = U.diff(s).numMax
    var lim = Math.max(3, Math.floor(cap / 2) - 1)
    var x = U.randInt(1, lim)
    var y = U.randInt(1, lim)
    var z = U.randInt(1, lim)
    if (x === y || y === z || x === z) return null // 不同的字代表不同的数
    var a = x + y
    var b = y + z
    var c = x + z
    if (a > cap || b > cap || c > cap) return null
    var cs = pickChars(3)
    var X = cs[0]
    var Y = cs[1]
    var Z = cs[2]
    var half = (a + b + c) / 2
    return {
      topic: 'wenzimi',
      variant: 'chain',
      stem: X + ' + ' + Y + ' = ' + a + '，' + Y + ' + ' + Z + ' = ' + b + '，' + X + ' + ' + Z + ' = ' + c + '。「' + X + '」是几？',
      answer: x,
      unit: '',
      ansLabel: '答：' + X + ' =',
      ansSuffix: '。',
      solution: [
        { tag: '想一想', text: '把三条算式都加起来：每个字都正好出现两次。' },
        { tag: '第 1 步', text: a + ' + ' + b + ' + ' + c + ' = ' + (a + b + c) + '，它是（' + X + '+' + Y + '+' + Z + '）的两倍，平分得 ' + X + '+' + Y + '+' + Z + ' = ' + half + '。' },
        { tag: '第 2 步', text: '去掉「' + Y + '+' + Z + ' = ' + b + '」这一块：' + X + ' = ' + half + ' − ' + b + ' = ' + x + '。' },
        { tag: '验一验', text: X + ' = ' + x + '，那 ' + Y + ' = ' + a + ' − ' + x + ' = ' + y + '，' + Z + ' = ' + c + ' − ' + x + ' = ' + z + '；查第二条：' + y + ' + ' + z + ' = ' + b + ' ✓' },
        { tag: '答', text: X + ' = ' + x + '（' + Y + ' = ' + y + '，' + Z + ' = ' + z + '）。' }
      ],
      key: 'chain:' + a + ',' + b + ',' + c
    }
  }

  var WENZIMI = {
    id: 'wenzimi',
    no: '21',
    stage: 'L2',
    name: '加减法文字谜',
    lesson: {
      title: '加减法文字谜 · 方法讲解',
      sections: [
        {
          heading: '这是什么问题？',
          paras: ['算式里的汉字是「戴着面具的数」：相同的字代表相同的数，不同的字代表不同的数。我们的任务就是把面具一个个摘下来。']
        },
        {
          heading: '怎么想？',
          paras: [
            '先找突破口：只有一种字的算式最好下手——两个相同的数相加，平分就能求出来。',
            '解出一个字，就把它的值代进别的算式里，像开锁一样，一环一环往下解。'
          ]
        },
        {
          heading: '例题示范',
          example: {
            stem: '学 + 学 = 14，学 + 数 = 16。数是几？',
            solution: [
              { tag: '想一想', text: '第一条算式里只有「学」，从它下手。' },
              { tag: '第 1 步', text: '学 + 学 = 14，把 14 平分成两份：学 = 7。' },
              { tag: '第 2 步', text: '把学 = 7 代进第二条：7 + 数 = 16，数 = 16 − 7 = 9。' },
              { tag: '验一验', text: '7 + 7 = 14 ✓，7 + 9 = 16 ✓' },
              { tag: '答', text: '数 = 9。' }
            ]
          }
        },
        { heading: '记住口诀', chant: '同字同数要记牢，单字算式先下手；解出一个代进去，一环一环全解开。' }
      ]
    },
    variants: [
      { id: 'same', setting: 'vWzSame', label: '同字谜（相同的字）', gen: genSame },
      { id: 'pair', setting: 'vWzPair', label: '和差谜（两条算式）', gen: genPair },
      { id: 'chain', setting: 'vWzChain', label: '三字连环（三条算式）', def: false, gen: genChain }
    ],
    generate: function (s) {
      return U.generateFrom(WENZIMI.variants, s)
    },
    titleFor: function (s) {
      return '加减法文字谜练习 · ' + U.diff(s).numMax + '以内'
    }
  }

  root.SumSum.aoshu.topics.wenzimi = WENZIMI
  root.SumSum.aoshu.topicList.push(WENZIMI)
})(typeof window !== 'undefined' ? window : globalThis)
