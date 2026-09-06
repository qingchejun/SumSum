/**
 * 知识点「22 加减法添去括号（一）」（L2）：减去/加上「一个和」。
 * 核心规则：a − (b + c) = a − b − c；a + (b + c) = a + b + c（符号不变）。
 * 变式：①去括号填符号 ②去括号巧算（先减凑整十）③添括号巧算（后两数凑整十，默认关）。
 * 简算题的数字全部构造成真凑整，解析里的每一步都真算。
 */
(function (root) {
  'use strict'

  var U = root.SumSum.aoshu.util

  /* 变式①去括号填符号：a − (b + c) 填「−」，a + (b + c) 填「+」 */
  function genFill(s) {
    var cap = U.diff(s).numMax
    var b = U.randInt(1, 9)
    var c = U.randInt(1, 9)
    if (Math.random() < 0.6) {
      /* 减去一个和 */
      if (b + c + 1 > cap) return null
      var a = U.randInt(b + c + 1, cap)
      var r = a - b - c
      return {
        topic: 'kuohao1',
        variant: 'fill',
        stem: a + ' − (' + b + ' + ' + c + ') = ' + a + ' − ' + b + ' ○ ' + c + '。○ 里应该填「+」还是「−」？',
        answer: '−',
        unit: '',
        ansLabel: '答：○ 里填',
        ansSuffix: '。',
        solution: [
          { tag: '想一想', text: '减去「' + b + ' 和 ' + c + ' 的和」，就是把 ' + b + ' 和 ' + c + ' 都减掉。' },
          { tag: '找规则', text: '减去一个和，可以连着减：先减 ' + b + '，再减 ' + c + '——○ 里是「−」。' },
          { tag: '验一验', text: '左边：' + b + ' + ' + c + ' = ' + (b + c) + '，' + a + ' − ' + (b + c) + ' = ' + r + '；右边：' + a + ' − ' + b + ' − ' + c + ' = ' + r + '。两边相等 ✓' },
          { tag: '答', text: '○ 里填「−」。' }
        ],
        key: 'fill:sub:' + a + ',' + b + ',' + c
      }
    }
    /* 加上一个和 */
    if (cap - b - c - 1 < 1) return null
    var a2 = U.randInt(1, cap - b - c)
    var r2 = a2 + b + c
    return {
      topic: 'kuohao1',
      variant: 'fill',
      stem: a2 + ' + (' + b + ' + ' + c + ') = ' + a2 + ' + ' + b + ' ○ ' + c + '。○ 里应该填「+」还是「−」？',
      answer: '+',
      unit: '',
      ansLabel: '答：○ 里填',
      ansSuffix: '。',
      solution: [
        { tag: '想一想', text: '加上「' + b + ' 和 ' + c + ' 的和」，就是把 ' + b + ' 和 ' + c + ' 都加上。' },
        { tag: '找规则', text: '加上一个和，可以连着加：先加 ' + b + '，再加 ' + c + '——○ 里是「+」。' },
        { tag: '验一验', text: '左边：' + b + ' + ' + c + ' = ' + (b + c) + '，' + a2 + ' + ' + (b + c) + ' = ' + r2 + '；右边：' + a2 + ' + ' + b + ' + ' + c + ' = ' + r2 + '。两边相等 ✓' },
        { tag: '答', text: '○ 里填「+」。' }
      ],
      key: 'fill:add:' + a2 + ',' + b + ',' + c
    }
  }

  /* 变式②去括号巧算：a − (b + c)，b 正好是 a 的个位，先减 b 凑成整十 */
  function genSimp(s) {
    var cap = U.diff(s).numMax
    if (cap < 15) return null
    var a = U.randInt(11, cap)
    var b = a % 10
    if (b < 1) return null // 个位是 0 就没得凑了
    var c = U.randInt(1, 9)
    if (a - b - c < 0) return null
    var round = a - b
    var r = round - c
    return {
      topic: 'kuohao1',
      variant: 'simp',
      stem: '用简便方法算：' + a + ' − (' + b + ' + ' + c + ')',
      answer: r,
      unit: '',
      ansLabel: '答：' + a + ' − (' + b + ' + ' + c + ') =',
      ansSuffix: '。',
      solution: [
        { tag: '想一想', text: '去掉括号：减去一个和 = 连着减，变成 ' + a + ' − ' + b + ' − ' + c + '。' },
        { tag: '巧算', text: '先减 ' + b + ' 正好凑成整十：' + a + ' − ' + b + ' = ' + round + '，再 ' + round + ' − ' + c + ' = ' + r + '。' },
        { tag: '验一验', text: '按括号先算：' + b + ' + ' + c + ' = ' + (b + c) + '，' + a + ' − ' + (b + c) + ' = ' + r + '，一样 ✓' },
        { tag: '答', text: a + ' − (' + b + ' + ' + c + ') = ' + r + '。' }
      ],
      key: 'simp:' + a + ',' + b + ',' + c
    }
  }

  /* 变式③添括号巧算：a − b − c，后两数 b + c 凑整十（默认关） */
  function genAddParen(s) {
    var cap = U.diff(s).numMax
    if (cap < 15) return null
    var round = 10 * U.randInt(1, Math.max(1, Math.floor((cap - 1) / 10) - 1))
    var b = U.randInt(1, round - 1)
    var c = round - b
    if (c < 1 || c > 9 + 10) return null // c 别太大，口算得动
    var a = U.randInt(round + 1, cap)
    if ((a - b) % 10 === 0) return null // 老实算也凑整就体现不出「巧」了
    var r = a - round
    return {
      topic: 'kuohao1',
      variant: 'addp',
      stem: '用简便方法算：' + a + ' − ' + b + ' − ' + c,
      answer: r,
      unit: '',
      ansLabel: '答：' + a + ' − ' + b + ' − ' + c + ' =',
      ansSuffix: '。',
      solution: [
        { tag: '想一想', text: '一个一个减不凑整；看看后面两个数：' + b + ' + ' + c + ' = ' + round + '，正好是整十！' },
        { tag: '巧算', text: '添上括号一起减：' + a + ' − (' + b + ' + ' + c + ') = ' + a + ' − ' + round + ' = ' + r + '。' },
        { tag: '验一验', text: '老老实实算：' + a + ' − ' + b + ' = ' + (a - b) + '，' + (a - b) + ' − ' + c + ' = ' + r + '，一样 ✓' },
        { tag: '答', text: a + ' − ' + b + ' − ' + c + ' = ' + r + '。' }
      ],
      key: 'addp:' + a + ',' + b + ',' + c
    }
  }

  var KUOHAO1 = {
    id: 'kuohao1',
    no: '22',
    stage: 'L2',
    name: '加减法添去括号（一）',
    lesson: {
      title: '添去括号（一） · 方法讲解',
      sections: [
        {
          heading: '这是什么问题？',
          paras: ['括号像一个袋子，把两个数装在一起。减去这个袋子，就是把袋子里的东西一件一件都减掉；加上这个袋子，就是一件一件都加上。']
        },
        {
          heading: '怎么想？',
          paras: [
            '袋子里是「加法」时，拆开袋子符号不变：减去一个和 = 连着减；加上一个和 = 连着加。',
            '添去括号的本事是用来「凑整十」的：哪两个数凑在一起是整十，就让它们进一个袋子，先算它们。'
          ]
        },
        {
          heading: '例题示范',
          example: {
            stem: '用简便方法算：15 − (5 + 3)',
            solution: [
              { tag: '想一想', text: '减去「5 和 3 的和」，就是把 5 和 3 都减掉：15 − 5 − 3。' },
              { tag: '巧算', text: '先减 5 正好凑成整十：15 − 5 = 10，再 10 − 3 = 7。' },
              { tag: '验一验', text: '按括号先算：5 + 3 = 8，15 − 8 = 7，一样 ✓' },
              { tag: '答', text: '15 − (5 + 3) = 7。' }
            ]
          }
        },
        { heading: '记住口诀', chant: '减去和，连着减；加上和，连着加；谁能凑整装袋里，又快又对人人夸。' }
      ]
    },
    variants: [
      { id: 'fill', setting: 'vKh1Fill', label: '去括号，填符号', gen: genFill },
      { id: 'simp', setting: 'vKh1Simp', label: '去括号巧算', gen: genSimp },
      { id: 'addp', setting: 'vKh1AddParen', label: '添括号巧算', def: false, gen: genAddParen }
    ],
    generate: function (s) {
      return U.generateFrom(KUOHAO1.variants, s)
    },
    titleFor: function (s) {
      return '添去括号（一）练习 · ' + U.diff(s).numMax + '以内'
    }
  }

  root.SumSum.aoshu.topics.kuohao1 = KUOHAO1
  root.SumSum.aoshu.topicList.push(KUOHAO1)
})(typeof window !== 'undefined' ? window : globalThis)
