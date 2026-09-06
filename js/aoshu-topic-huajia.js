/**
 * 知识点「29 化加为乘」（L2）：一串长得差不多的加数，先变整齐再用乘法。
 * 变式：①差一个的连加（把 a±1 看成 a）②接近整十巧算（9 看成 10−1）
 *      ③匀一匀变相同（一多一少移多补少，默认关）。
 * 全部反向构造，乘法保持在口诀范围内。
 */
(function (root) {
  'use strict'

  var U = root.SumSum.aoshu.util

  /* 各难度档的加数大小与个数 */
  var CAP = {
    L1: { aMin: 3, aMax: 5, nMin: 3, nMax: 4, kMin: 3, kMax: 4 },
    L2: { aMin: 3, aMax: 9, nMin: 3, nMax: 5, kMin: 3, kMax: 6 },
    L3: { aMin: 6, aMax: 9, nMin: 4, nMax: 5, kMin: 4, kMax: 6 }
  }

  function cap(s) {
    return CAP[s.difficulty] || CAP.L1
  }

  /* 把一串加数插到随机位置，返回新数组（不改原数组） */
  function insertAt(arr, val) {
    var at = U.randInt(0, arr.length)
    return arr.slice(0, at).concat([val], arr.slice(at))
  }

  /* 连加验算文案：「7 + 7 = 14，再加 7 是 21，再加 8 是 29」 */
  function chainText(nums) {
    var acc = nums[0] + nums[1]
    var parts = [nums[0] + ' + ' + nums[1] + ' = ' + acc]
    for (var i = 2; i < nums.length; i++) {
      acc += nums[i]
      parts.push('再加 ' + nums[i] + ' 是 ' + acc)
    }
    return parts.join('，')
  }

  /* 变式①差一个的连加：n 个 a 外加一个 a±1 */
  function genNear(s) {
    var c = cap(s)
    var a = U.randInt(c.aMin, c.aMax)
    var n = U.randInt(c.nMin, c.nMax)
    var up = Math.random() < 0.5
    var b = up ? a + 1 : a - 1
    if (b < 2) return null
    var ans = a * (n + 1) + (up ? 1 : -1)
    var nums = []
    for (var i = 0; i < n; i++) nums.push(a)
    nums = insertAt(nums, b)
    return {
      topic: 'huajia',
      variant: 'near',
      stem: '巧算：' + nums.join(' + '),
      answer: ans,
      unit: '',
      ansLabel: '答：得数是',
      ansSuffix: '。',
      solution: [
        { tag: '想一想', text: '数一数：' + n + ' 个 ' + a + '，还有一个 ' + b + '——把 ' + b + ' 看成「' + a + (up ? ' + 1' : ' − 1') + '」，加数就整齐了。' },
        { tag: '化加为乘', text: '一共 ' + (n + 1) + ' 个 ' + a + '，再' + (up ? '多 1' : '少 1') + '：' + a + ' × ' + (n + 1) + (up ? ' + 1' : ' − 1') + '。' },
        { tag: '列算式', text: a + ' × ' + (n + 1) + ' = ' + a * (n + 1) + '，' + a * (n + 1) + (up ? ' + 1 = ' : ' − 1 = ') + ans + '。' },
        { tag: '验一验', text: '老老实实连加：' + chainText(nums) + ' ✓' },
        { tag: '答', text: '得数是 ' + ans + '。' }
      ],
      key: 'near:' + a + ',' + n + ',' + b
    }
  }

  /* 变式②接近整十：k 个 9（或 8）连加，看成 10−1（10−2） */
  function genNine(s) {
    var c = cap(s)
    var base = U.pick([9, 9, 8]) // 9 更常见
    var k = U.randInt(c.kMin, c.kMax)
    var per = 10 - base
    var ans = base * k
    var nums = []
    for (var i = 0; i < k; i++) nums.push(base)
    return {
      topic: 'huajia',
      variant: 'nine',
      stem: '巧算：' + nums.join(' + '),
      answer: ans,
      unit: '',
      ansLabel: '答：得数是',
      ansSuffix: '。',
      solution: [
        { tag: '想一想', text: '每个 ' + base + ' 都差 ' + per + ' 就是 10——把它看成「10 − ' + per + '」来算。' },
        { tag: '巧算', text: k + ' 个 10 是 ' + 10 * k + '；每个都多算了 ' + per + '，' + k + ' 个共多算 ' + per * k + '，要减掉：' + 10 * k + ' − ' + per * k + ' = ' + ans + '。' },
        { tag: '验一验', text: '用乘法口诀印证：' + base + ' × ' + k + ' = ' + ans + '，两种算法一样 ✓' },
        { tag: '答', text: '得数是 ' + ans + '。' }
      ],
      key: 'nine:' + base + ',' + k
    }
  }

  /* 变式③匀一匀：n−2 个 a + (a−k) + (a+k)，移多补少变整齐 */
  function genEven(s) {
    var c = cap(s)
    var a = U.randInt(Math.max(3, c.aMin), c.aMax)
    var n = U.randInt(Math.max(4, c.nMin), c.nMax)
    var k = U.randInt(1, Math.min(2, a - 2))
    var ans = a * n
    var nums = []
    for (var i = 0; i < n - 2; i++) nums.push(a)
    nums = insertAt(nums, a - k)
    nums = insertAt(nums, a + k)
    return {
      topic: 'huajia',
      variant: 'even',
      stem: '巧算：' + nums.join(' + '),
      answer: ans,
      unit: '',
      ansLabel: '答：得数是',
      ansSuffix: '。',
      solution: [
        { tag: '想一想', text: '这些加数大多是 ' + a + '，只有 ' + (a - k) + ' 和 ' + (a + k) + ' 不一样——一个少 ' + k + '、一个多 ' + k + '。' },
        { tag: '匀一匀', text: '把 ' + (a + k) + ' 多出来的 ' + k + ' 补给 ' + (a - k) + '，两个都变成 ' + a + '——这就是我们学过的移多补少！' },
        { tag: '化加为乘', text: '现在是 ' + n + ' 个 ' + a + '：' + a + ' × ' + n + ' = ' + ans + '。' },
        { tag: '验一验', text: '老老实实连加：' + chainText(nums) + ' ✓' },
        { tag: '答', text: '得数是 ' + ans + '。' }
      ],
      key: 'even:' + a + ',' + n + ',' + k
    }
  }

  var HUAJIA = {
    id: 'huajia',
    no: '29',
    stage: 'L2',
    name: '化加为乘',
    lesson: {
      title: '化加为乘 · 方法讲解',
      sections: [
        {
          heading: '这是什么问题？',
          paras: ['一长串加数长得差不多时，一个一个傻加又慢又容易错。先把加数「变整齐」，再用乘法一口气算完——这就是化加为乘。']
        },
        {
          heading: '怎么想？',
          paras: [
            '第一招：只有一个不一样？把它看成「差 1 补 1」，如 7、7、7、8 里的 8 就是 7 + 1。',
            '第二招：都是 9 或 8？看成 10 − 1、10 − 2，先按整十算再把多算的减掉。',
            '第三招：一个多、一个少？用移多补少匀一匀，全都变成一样的。'
          ]
        },
        {
          heading: '例题示范',
          example: {
            stem: '巧算：7 + 7 + 7 + 8',
            solution: [
              { tag: '想一想', text: '数一数：3 个 7，还有一个 8——把 8 看成「7 + 1」，加数就整齐了。' },
              { tag: '化加为乘', text: '一共 4 个 7，再多 1：7 × 4 + 1。' },
              { tag: '列算式', text: '7 × 4 = 28，28 + 1 = 29。' },
              { tag: '验一验', text: '老老实实连加：7 + 7 = 14，再加 7 是 21，再加 8 是 29 ✓' },
              { tag: '答', text: '得数是 29。' }
            ]
          }
        },
        { heading: '记住口诀', chant: '加数长得像，先把它变齐；几个几相加，乘法一口气。' }
      ]
    },
    variants: [
      { id: 'near', setting: 'vHjNear', label: '差一个的连加', gen: genNear },
      { id: 'nine', setting: 'vHjNine', label: '接近整十巧算（9 看成 10−1）', gen: genNine },
      { id: 'even', setting: 'vHjEven', label: '匀一匀变相同（移多补少）', def: false, gen: genEven }
    ],
    generate: function (s) {
      return U.generateFrom(HUAJIA.variants, s)
    },
    titleFor: function (s) {
      return '化加为乘练习 · ' + U.DIFF_LABEL[s.difficulty]
    }
  }

  root.SumSum.aoshu.topics.huajia = HUAJIA
  root.SumSum.aoshu.topicList.push(HUAJIA)
})(typeof window !== 'undefined' ? window : globalThis)
