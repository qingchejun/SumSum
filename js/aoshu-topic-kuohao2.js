/**
 * 知识点「23 加减法添去括号（二）」（L2）：减去/加上「一个差」——符号要翻身。
 * 核心规则：a − (b − c) = a − b + c（多减的要加回来）；a + (b − c) = a + b − c。
 * 变式：①减去一个差填符号 ②巧算（两种凑整形态）③小马虎错题（默认关）。
 */
(function (root) {
  'use strict'

  var U = root.SumSum.aoshu.util

  /* 变式①去括号填符号：a − (b − c) 填「+」，a + (b − c) 填「−」 */
  function genFill(s) {
    var cap = U.diff(s).numMax
    var c = U.randInt(1, 8)
    var b = U.randInt(c + 1, Math.min(cap - 1, c + 9)) // b > c，差为正
    var d = b - c
    if (Math.random() < 0.7) {
      /* 减去一个差（重点形态） */
      if (b + 1 > cap) return null
      var a = U.randInt(b, cap) // a ≥ b，右边先减 b 不出负数
      var r = a - d
      return {
        topic: 'kuohao2',
        variant: 'fill',
        stem: a + ' − (' + b + ' − ' + c + ') = ' + a + ' − ' + b + ' ○ ' + c + '。○ 里应该填「+」还是「−」？',
        answer: '+',
        unit: '',
        ansLabel: '答：○ 里填',
        ansSuffix: '。',
        solution: [
          { tag: '想一想', text: '该减的只是「' + b + ' − ' + c + '」这个差，也就是 ' + d + '；可右边把整个 ' + b + ' 都减掉了——减多了！' },
          { tag: '找规则', text: '多减了 ' + c + '，就要把 ' + c + ' 加回来——○ 里是「+」。减去一个差，符号要翻身。' },
          { tag: '验一验', text: '左边：' + b + ' − ' + c + ' = ' + d + '，' + a + ' − ' + d + ' = ' + r + '；右边：' + a + ' − ' + b + ' + ' + c + ' = ' + (a - b) + ' + ' + c + ' = ' + r + '。两边相等 ✓' },
          { tag: '答', text: '○ 里填「+」。' }
        ],
        key: 'fill:sub:' + a + ',' + b + ',' + c
      }
    }
    /* 加上一个差 */
    if (cap - b < 1) return null
    var a2 = U.randInt(1, cap - b)
    var r2 = a2 + d
    return {
      topic: 'kuohao2',
      variant: 'fill',
      stem: a2 + ' + (' + b + ' − ' + c + ') = ' + a2 + ' + ' + b + ' ○ ' + c + '。○ 里应该填「+」还是「−」？',
      answer: '−',
      unit: '',
      ansLabel: '答：○ 里填',
      ansSuffix: '。',
      solution: [
        { tag: '想一想', text: '该加的只是「' + b + ' − ' + c + '」这个差，也就是 ' + d + '；可右边把整个 ' + b + ' 都加上了——加多了！' },
        { tag: '找规则', text: '多加了 ' + c + '，就要把 ' + c + ' 减回去——○ 里是「−」。' },
        { tag: '验一验', text: '左边：' + b + ' − ' + c + ' = ' + d + '，' + a2 + ' + ' + d + ' = ' + r2 + '；右边：' + a2 + ' + ' + b + ' − ' + c + ' = ' + (a2 + b) + ' − ' + c + ' = ' + r2 + '。两边相等 ✓' },
        { tag: '答', text: '○ 里填「−」。' }
      ],
      key: 'fill:add:' + a2 + ',' + b + ',' + c
    }
  }

  /* 变式②巧算：形态 A「a − b + c，b−c 凑整十」；形态 B「a + (b − c)，a+b 凑整」 */
  function genSimp(s) {
    var cap = U.diff(s).numMax
    if (cap < 20) return null
    if (Math.random() < 0.5) {
      /* 形态 A：45 − 18 + 8 = 45 − (18 − 8) */
      var round = 10 * U.randInt(1, Math.max(1, Math.floor(cap / 10) - 1))
      var c = U.randInt(1, 9)
      var b = c + round
      if (b + 1 > cap) return null
      var a = U.randInt(b, cap)
      if (a % 10 === b % 10) return null // 老实算 a−b 也凑整就不巧了
      var r = a - round
      return {
        topic: 'kuohao2',
        variant: 'simp',
        stem: '用简便方法算：' + a + ' − ' + b + ' + ' + c,
        answer: r,
        unit: '',
        ansLabel: '答：' + a + ' − ' + b + ' + ' + c + ' =',
        ansSuffix: '。',
        solution: [
          { tag: '想一想', text: '先减 ' + b + ' 再加 ' + c + '？减多了再补回来——其实只减了「' + b + ' − ' + c + '」。' },
          { tag: '巧算', text: '添上括号：' + a + ' − (' + b + ' − ' + c + ') = ' + a + ' − ' + round + ' = ' + r + '，一步凑整！' },
          { tag: '验一验', text: '老老实实算：' + a + ' − ' + b + ' = ' + (a - b) + '，' + (a - b) + ' + ' + c + ' = ' + r + '，一样 ✓' },
          { tag: '答', text: a + ' − ' + b + ' + ' + c + ' = ' + r + '。' }
        ],
        key: 'simp:a:' + a + ',' + b + ',' + c
      }
    }
    /* 形态 B：37 + (13 − 9)：去括号后 37 + 13 凑整。括号里的数取 11~19，太小就没有「巧」了 */
    var round2 = 10 * U.randInt(2, Math.max(2, Math.floor(cap / 10)))
    var b2 = U.randInt(11, 19)
    var a2 = round2 - b2
    if (a2 < 1) return null
    var c2 = U.randInt(1, 9)
    if (c2 >= b2) return null
    if (b2 % 10 === c2 % 10) return null // 括号里先算正好整十的话普通算法也不亏
    var r2 = round2 - c2
    if (r2 > cap) return null
    return {
      topic: 'kuohao2',
      variant: 'simp',
      stem: '用简便方法算：' + a2 + ' + (' + b2 + ' − ' + c2 + ')',
      answer: r2,
      unit: '',
      ansLabel: '答：' + a2 + ' + (' + b2 + ' − ' + c2 + ') =',
      ansSuffix: '。',
      solution: [
        { tag: '想一想', text: '加上一个差 = 先加 ' + b2 + ' 再减 ' + c2 + '；而 ' + a2 + ' + ' + b2 + ' 正好凑成 ' + round2 + '！' },
        { tag: '巧算', text: '去掉括号：' + a2 + ' + ' + b2 + ' − ' + c2 + ' = ' + round2 + ' − ' + c2 + ' = ' + r2 + '。' },
        { tag: '验一验', text: '按括号先算：' + b2 + ' − ' + c2 + ' = ' + (b2 - c2) + '，' + a2 + ' + ' + (b2 - c2) + ' = ' + r2 + '，一样 ✓' },
        { tag: '答', text: a2 + ' + (' + b2 + ' − ' + c2 + ') = ' + r2 + '。' }
      ],
      key: 'simp:b:' + a2 + ',' + b2 + ',' + c2
    }
  }

  /* 变式③小马虎错题：把 a − (b − c) 错算成 a − b − c，结果少了 2c（默认关） */
  function genMistake(s) {
    var cap = U.diff(s).numMax
    var c = U.randInt(1, 8)
    var b = U.randInt(c + 1, Math.min(cap - 1, c + 9))
    if (b + c + 1 > cap) return null
    var a = U.randInt(b + c, cap) // 保证错误算法也不出负数
    var right = a - b + c
    var wrong = a - b - c
    var name = U.pick(U.NAMES)
    return {
      topic: 'kuohao2',
      variant: 'mist',
      stem: name + '做题时马虎了：把 ' + a + ' − (' + b + ' − ' + c + ') 错算成了 ' + a + ' − ' + b + ' − ' + c + '。' + U.pron(name) + '算出的结果比正确答案多了还是少了？差多少？',
      answer: 2 * c,
      unit: '',
      ansLabel: '答：比正确答案＿＿了',
      ansSuffix: '。',
      solution: [
        { tag: '第 1 步', text: '正确地算：' + b + ' − ' + c + ' = ' + (b - c) + '，' + a + ' − ' + (b - c) + ' = ' + right + '。' },
        { tag: '第 2 步', text: '马虎地算：' + a + ' − ' + b + ' = ' + (a - b) + '，' + (a - b) + ' − ' + c + ' = ' + wrong + '。' },
        { tag: '比一比', text: right + ' − ' + wrong + ' = ' + 2 * c + '：错的结果少了 ' + 2 * c + '。' },
        { tag: '想一想', text: '为什么正好差两个 ' + c + '？该加回来的 ' + c + ' 没加（少一个），反而又多减了一个 ' + c + '（又少一个）。' },
        { tag: '答', text: '少了 ' + 2 * c + '。' }
      ],
      key: 'mist:' + a + ',' + b + ',' + c
    }
  }

  var KUOHAO2 = {
    id: 'kuohao2',
    no: '23',
    stage: 'L2',
    name: '加减法添去括号（二）',
    lesson: {
      title: '添去括号（二） · 方法讲解',
      sections: [
        {
          heading: '这是什么问题？',
          paras: ['这次袋子里装的是「减法」：比如 20 − (8 − 3)，袋子里是「8 减 3」，该减的其实只有 5。拆这种袋子时，符号会翻身——这是最容易错的地方。']
        },
        {
          heading: '怎么想？',
          paras: [
            '减去一个差：直接减 8 就减多了，多减的 3 要加回来，所以 20 − (8 − 3) = 20 − 8 + 3。',
            '加上一个差：先加 8 就加多了，多加的 3 要减回去，所以 20 + (8 − 3) = 20 + 8 − 3。',
            '记不清就用小数字试一试：两边各算一遍，相等才对。'
          ]
        },
        {
          heading: '例题示范',
          example: {
            stem: '20 − (8 − 3) = 20 − 8 ○ 3。○ 里应该填「+」还是「−」？',
            solution: [
              { tag: '想一想', text: '该减的只是 8 − 3 = 5；可右边把整个 8 都减掉了，减多了 3。' },
              { tag: '找规则', text: '多减的 3 要加回来——○ 里是「+」。' },
              { tag: '验一验', text: '左边：20 − 5 = 15；右边：20 − 8 + 3 = 12 + 3 = 15。相等 ✓' },
              { tag: '答', text: '○ 里填「+」。' }
            ]
          }
        },
        { heading: '记住口诀', chant: '袋里是减要当心：减去差，加回小；加上差，减回小；拆完两边验一验。' }
      ]
    },
    variants: [
      { id: 'fill', setting: 'vKh2Fill', label: '减去一个差，填符号', gen: genFill },
      { id: 'simp', setting: 'vKh2Simp', label: '添去括号巧算', gen: genSimp },
      { id: 'mist', setting: 'vKh2Mistake', label: '小马虎错题', def: false, gen: genMistake }
    ],
    generate: function (s) {
      return U.generateFrom(KUOHAO2.variants, s)
    },
    titleFor: function (s) {
      return '添去括号（二）练习 · ' + U.diff(s).numMax + '以内'
    }
  }

  root.SumSum.aoshu.topics.kuohao2 = KUOHAO2
  root.SumSum.aoshu.topicList.push(KUOHAO2)
})(typeof window !== 'undefined' ? window : globalThis)
