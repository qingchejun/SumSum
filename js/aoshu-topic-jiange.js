/**
 * 知识点「16 间隔问题」：段数和间隔数总是差 1 的一类问题。
 * 变式：①锯木头（段数 ↔ 次数）②爬楼梯（楼层 ↔ 层数）③排一排放花（人数 ↔ 间隔数）。
 */
(function (root) {
  'use strict'

  var U = root.SumSum.aoshu.util

  /* 各难度档的数量上限（段数/楼层/人数，太大不真实也画不了图） */
  var CAP = { L1: 9, L2: 20, L3: 50 }

  function cap(s) {
    return CAP[s.difficulty] || CAP.L1
  }

  /* 木头示意图：▂|▂|▂（段数多了画不下就退化成文字描述） */
  function sawArt(segs) {
    if (segs > 12) return ''
    var parts = []
    for (var i = 0; i < segs; i++) parts.push('▂')
    return parts.join('|') + '，'
  }

  /* 变式①锯木头：随机出「锯成 n 段要几次」或「锯 k 次成几段」 */
  function genSaw(s) {
    var c = cap(s)
    if (Math.random() < 0.5) {
      var n = U.randInt(3, c)
      return {
        topic: 'jiange',
        variant: 'saw',
        stem: '一根木头要锯成 ' + n + ' 段，需要锯几次？',
        answer: n - 1,
        unit: '次',
        ansLabel: '答：需要锯',
        ansSuffix: '次。',
        solution: [
          { tag: '想一想', text: '锯 1 次变成 2 段，锯 2 次变成 3 段——锯的次数总比段数少 1。' },
          { tag: '列算式', text: n + ' − 1 = ' + (n - 1) + '（次）。' },
          { tag: '验一验', text: '画一画：' + sawArt(n) + (n - 1) + ' 个锯口「|」正好分出 ' + n + ' 段 ✓' },
          { tag: '答', text: '需要锯 ' + (n - 1) + ' 次。' }
        ],
        key: 'saw:a:' + n
      }
    }
    var k = U.randInt(2, c - 1)
    return {
      topic: 'jiange',
      variant: 'saw',
      stem: '一根木头，锯了 ' + k + ' 次，锯成了几段？',
      answer: k + 1,
      unit: '段',
      ansLabel: '答：锯成了',
      ansSuffix: '段。',
      solution: [
        { tag: '想一想', text: '锯 1 次变成 2 段，锯 2 次变成 3 段——段数总比锯的次数多 1。' },
        { tag: '列算式', text: k + ' + 1 = ' + (k + 1) + '（段）。' },
        { tag: '验一验', text: '画一画：' + sawArt(k + 1) + k + ' 个锯口「|」正好分成 ' + (k + 1) + ' 段 ✓' },
        { tag: '答', text: '锯成了 ' + (k + 1) + ' 段。' }
      ],
      key: 'saw:b:' + k
    }
  }

  /* 变式②爬楼梯：从 1 楼到 n 楼走几层 */
  function genStairs(s) {
    var n = U.randInt(3, cap(s))
    var name = U.pick(U.NAMES)
    return {
      topic: 'jiange',
      variant: 'stairs',
      stem: name + '从 1 楼走到 ' + n + ' 楼，一共要走几层楼梯？',
      answer: n - 1,
      unit: '层',
      ansLabel: '答：一共要走',
      ansSuffix: '层楼梯。',
      solution: [
        { tag: '想一想', text: '从 1 楼到 2 楼才走 1 层楼梯——走的层数总比楼层数少 1。' },
        { tag: '列算式', text: n + ' − 1 = ' + (n - 1) + '（层）。' },
        { tag: '验一验', text: '从 1 楼数起：到 2 楼走 1 层，到 3 楼走 2 层……到 ' + n + ' 楼正好走 ' + (n - 1) + ' 层 ✓' },
        { tag: '答', text: '一共要走 ' + (n - 1) + ' 层楼梯。' }
      ],
      key: 'stairs:' + n
    }
  }

  /* 变式③排一排：n 个人相邻两人之间放 1 盆花，求花的数量 */
  function genRow(s) {
    var n = U.randInt(3, Math.min(cap(s), 10)) // 人数别太多，圆点图要画得下
    var groups = []
    for (var i = 0; i < n; i++) {
      groups.push({ type: 'hollow', n: 1 })
      if (i < n - 1) groups.push({ type: 'solid', n: 1 })
    }
    return {
      topic: 'jiange',
      variant: 'row',
      stem: n + ' 个小朋友站成一排，每相邻两人之间放 1 盆花，一共要放几盆花？',
      answer: n - 1,
      unit: '盆',
      ansLabel: '答：一共要放',
      ansSuffix: '盆花。',
      diagram: {
        rows: [{ label: '一排', groups: groups }],
        note: '○ 是小朋友，● 是花：' + n + ' 个小朋友中间正好 ' + (n - 1) + ' 盆花'
      },
      solution: [
        { tag: '想一想', text: '花放在两个人「中间」，两头站的都是人——所以人比花多 1 个。' },
        { tag: '列算式', text: n + ' − 1 = ' + (n - 1) + '（盆）。' },
        { tag: '验一验', text: '看上面的图：数一数 ● 正好 ' + (n - 1) + ' 盆 ✓' },
        { tag: '答', text: '一共要放 ' + (n - 1) + ' 盆花。' }
      ],
      key: 'row:' + n
    }
  }

  var JIANGE = {
    id: 'jiange',
    no: '16',
    stage: 'L1',
    name: '间隔问题',
    lesson: {
      title: '间隔问题 · 方法讲解',
      sections: [
        {
          heading: '这是什么问题？',
          paras: ['锯木头、爬楼梯、排队放花……这类问题里都藏着「间隔」：东西的个数和间隔的个数总是差 1，一不小心就会多算或少算 1 个。']
        },
        {
          heading: '怎么想？',
          paras: [
            '别急着列算式，先画个小小的图。比如：▂▂|▂▂|▂▂ ——3 段木头，只需要 2 个锯口。',
            '数一数就会发现：两头的东西总比中间的间隔多 1 个。锯木头是「次数 = 段数 − 1」，爬楼梯是「层数 = 楼层 − 1」。'
          ]
        },
        {
          heading: '例题示范',
          example: {
            stem: '一根木头要锯成 6 段，需要锯几次？',
            solution: [
              { tag: '想一想', text: '锯 1 次变成 2 段，锯 2 次变成 3 段——锯的次数总比段数少 1。' },
              { tag: '列算式', text: '6 − 1 = 5（次）。' },
              { tag: '验一验', text: '画一画：▂|▂|▂|▂|▂|▂，5 个锯口正好分出 6 段 ✓' },
              { tag: '答', text: '需要锯 5 次。' }
            ]
          }
        },
        { heading: '记住口诀', chant: '段数次数差个一，画个小图就清晰。' }
      ]
    },
    variants: [
      { id: 'saw', setting: 'vJgSaw', label: '锯木头（段数与次数）', gen: genSaw },
      { id: 'stairs', setting: 'vJgStairs', label: '爬楼梯（楼层与层数）', gen: genStairs },
      { id: 'row', setting: 'vJgRow', label: '排一排（人数与间隔）', gen: genRow }
    ],
    generate: function (s) {
      return U.generateFrom(JIANGE.variants, s)
    },
    titleFor: function (s) {
      return '间隔问题练习 · ' + U.DIFF_LABEL[s.difficulty]
    }
  }

  root.SumSum.aoshu.topics.jiange = JIANGE
  root.SumSum.aoshu.topicList.push(JIANGE)
})(typeof window !== 'undefined' ? window : globalThis)
