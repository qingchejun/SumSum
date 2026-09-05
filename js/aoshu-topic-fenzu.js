/**
 * 知识点「19 合理分组问题」：把一堆东西按要求分成一组一组。
 * 变式：①正好分组 ②分组有剩余 ③配对分组（看少的那样够不够）。
 * L1 解析用「圈一圈 / 连加」，不用乘除；L2/L3 括号里补除法算式。
 */
(function (root) {
  'use strict'

  var U = root.SumSum.aoshu.util

  var THINGS = [
    { n: '橘子', u: '个', c: '袋' },
    { n: '苹果', u: '个', c: '盘' },
    { n: '铅笔', u: '支', c: '盒' },
    { n: '饺子', u: '个', c: '盘' }
  ]

  /* 每份的个数 / 份数上限：L1 小一点，圈一圈画得过来 */
  function kMax(s) {
    return s.difficulty === 'L1' ? 5 : 9
  }

  /* k 个一份连加 g 次的算式串，如「3 + 3 + 3 + 3 = 12」 */
  function sumStr(k, g) {
    var parts = []
    for (var i = 0; i < g; i++) parts.push(k)
    return parts.join(' + ')
  }

  /* 圈一圈示意图：深浅相间，一段就是一份（总数 ≤ 20 才画） */
  function groupDiagram(k, g, r, note) {
    if (k * g + r > 20) return null
    var groups = []
    for (var i = 0; i < g; i++) groups.push({ type: i % 2 === 0 ? 'solid' : 'hollow', n: k })
    if (r > 0) groups.push({ type: g % 2 === 0 ? 'solid' : 'hollow', n: r })
    return { rows: [{ label: '圈一圈', groups: groups }], note: note }
  }

  /* 变式①：t = k × g，正好分成 g 份 */
  function genEqual(s) {
    var cap = U.diff(s).numMax
    var k = U.randInt(2, kMax(s))
    var g = U.randInt(2, kMax(s))
    var t = k * g
    if (t > cap) return null
    var it = U.pick(THINGS)
    var divNote = s.difficulty === 'L1' ? '' : '（也就是 ' + t + ' ÷ ' + k + ' = ' + g + '）'
    return {
      topic: 'fenzu',
      variant: 'equal',
      stem: '有 ' + t + ' ' + it.u + it.n + '，每 ' + k + ' ' + it.u + '装一' + it.c + '，正好装几' + it.c + '？',
      answer: g,
      unit: it.c,
      ansLabel: '答：正好装',
      ansSuffix: it.c + '。',
      diagram: groupDiagram(k, g, 0, '深浅相间地圈：' + k + ' ' + it.u + '一份，正好 ' + g + ' 份'),
      solution: [
        { tag: '想一想', text: '每 ' + k + ' ' + it.u + '一' + it.c + '，就是数一数 ' + t + ' 里面有几个 ' + k + '。' },
        { tag: '圈一圈', text: sumStr(k, g) + ' = ' + t + '，圈了 ' + g + ' 次正好圈完' + divNote + '。' },
        { tag: '验一验', text: g + ' ' + it.c + '，每' + it.c + ' ' + k + ' ' + it.u + '，一共正好 ' + t + ' ' + it.u + '，一个不多一个不少 ✓' },
        { tag: '答', text: '正好装 ' + g + ' ' + it.c + '。' }
      ],
      key: 'equal:' + t + ',' + k
    }
  }

  /* 变式②：t = k × g + r，最多装满 g 份，还剩 r 个 */
  function genRemain(s) {
    var cap = U.diff(s).numMax
    var k = U.randInt(2, kMax(s))
    var g = U.randInt(2, kMax(s))
    var r = U.randInt(1, k - 1)
    var t = k * g + r
    if (t > cap) return null
    var it = U.pick(THINGS)
    return {
      topic: 'fenzu',
      variant: 'remain',
      stem: '有 ' + t + ' ' + it.u + it.n + '，每 ' + k + ' ' + it.u + '装一' + it.c + '，最多能装满几' + it.c + '？',
      answer: g,
      unit: it.c,
      ansLabel: '答：最多能装满',
      ansSuffix: it.c + '。',
      diagram: groupDiagram(k, g, r, '圈满 ' + g + ' 份后，最后剩 ' + r + ' ' + it.u + '不够一份'),
      solution: [
        { tag: '想一想', text: '一' + it.c + '一' + it.c + '地装，装到剩下的不够一' + it.c + '为止。' },
        { tag: '圈一圈', text: sumStr(k, g) + ' = ' + k * g + '，圈了 ' + g + ' 次；还剩 ' + r + ' ' + it.u + '，不够再装一' + it.c + '了。' },
        { tag: '验一验', text: '装满的 ' + g + ' ' + it.c + '共 ' + k * g + ' ' + it.u + '，加上剩下的 ' + r + ' ' + it.u + '：' + k * g + ' + ' + r + ' = ' + t + '，正好 ✓' },
        { tag: '答', text: '最多能装满 ' + g + ' ' + it.c + '，还剩 ' + r + ' ' + it.u + '。' }
      ],
      key: 'remain:' + t + ',' + k
    }
  }

  /* 变式③：一男一女配一组，最多分 min(a, b) 组 */
  function genPair(s) {
    var cap = U.diff(s).numMax
    var top = Math.max(3, Math.floor(cap / 2))
    var a = U.randInt(2, top)
    var b = U.randInt(2, top)
    if (a === b) return null
    var m = Math.min(a, b)
    var few = a < b ? '男生' : '女生'
    var many = a < b ? '女生' : '男生'
    var left = Math.abs(a - b)
    return {
      topic: 'fenzu',
      variant: 'pair',
      stem:
        '班里有 ' + a + ' 个男生、' + b + ' 个女生，做游戏时每组要 1 个男生和 1 个女生。最多能分成几组？',
      answer: m,
      unit: '组',
      ansLabel: '答：最多能分成',
      ansSuffix: '组。',
      solution: [
        { tag: '想一想', text: '一组要一男一女，配一组就用掉一个男生和一个女生——哪边人少，哪边用完就分不下去了。' },
        { tag: '比一比', text: a + (a < b ? ' < ' : ' > ') + b + '，' + few + '少，只有 ' + m + ' 人。' },
        { tag: '验一验', text: '分了 ' + m + ' 组，用掉 ' + m + ' 个男生和 ' + m + ' 个女生；' + many + '还剩 ' + left + ' 人，没有' + few + '可配了 ✓' },
        { tag: '答', text: '最多能分成 ' + m + ' 组。' }
      ],
      key: 'pair:' + a + ',' + b
    }
  }

  var FENZU = {
    id: 'fenzu',
    no: '19',
    stage: 'L1',
    name: '合理分组问题',
    lesson: {
      title: '合理分组 · 方法讲解',
      sections: [
        {
          heading: '这是什么问题？',
          paras: ['把一堆东西按要求分成一组一组：有时正好分完，有时会有剩余，配对分组时还要看「少的那样」够不够。']
        },
        {
          heading: '怎么想？',
          paras: ['动手圈一圈最直观：每几个圈一个圈，看能圈几个圈；圈到剩下的不够一圈，就停下来。'],
          diagram: {
            rows: [
              {
                label: '圈一圈',
                groups: [
                  { type: 'solid', n: 3 },
                  { type: 'hollow', n: 3 },
                  { type: 'solid', n: 3 },
                  { type: 'hollow', n: 3 }
                ]
              }
            ],
            note: '12 个橘子，3 个一份深浅相间地圈——正好 4 份'
          }
        },
        {
          heading: '例题示范',
          example: {
            stem: '有 12 个橘子，每 3 个装一袋，正好装几袋？',
            solution: [
              { tag: '想一想', text: '每 3 个一袋，就是数一数 12 里面有几个 3。' },
              { tag: '圈一圈', text: '3 + 3 + 3 + 3 = 12，圈了 4 次正好圈完。' },
              { tag: '验一验', text: '4 袋，每袋 3 个，一共正好 12 个，一个不多一个不少 ✓' },
              { tag: '答', text: '正好装 4 袋。' }
            ]
          }
        },
        { heading: '记住口诀', chant: '几个一份圈一圈，圈到不够就算完。' }
      ]
    },
    variants: [
      { id: 'equal', setting: 'vFzEqual', label: '正好分组', gen: genEqual },
      { id: 'remain', setting: 'vFzRemain', label: '分组有剩余', gen: genRemain },
      { id: 'pair', setting: 'vFzPair', label: '配对分组', gen: genPair }
    ],
    generate: function (s) {
      return U.generateFrom(FENZU.variants, s)
    },
    titleFor: function (s) {
      return '合理分组练习 · ' + U.DIFF_LABEL[s.difficulty]
    }
  }

  root.SumSum.aoshu.topics.fenzu = FENZU
  root.SumSum.aoshu.topicList.push(FENZU)
})(typeof window !== 'undefined' ? window : globalThis)
