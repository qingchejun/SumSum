/**
 * 知识点「25 除法的三层含义」（L2）：同一个除法算式的三种问法——
 * 平均分（知份数求每份）、包含分（知每份求份数）、倍数（把倍数当份数）。
 * 全部从乘法反推构造（商、除数都在九九口诀表范围内），天然整除。
 */
(function (root) {
  'use strict'

  var U = root.SumSum.aoshu.util

  /* 各难度档的商与除数范围 */
  var RANGE = {
    L1: { fMin: 2, fMax: 5 },
    L2: { fMin: 2, fMax: 9 },
    L3: { fMin: 2, fMax: 9 }
  }

  function range(s) {
    return RANGE[s.difficulty] || RANGE.L1
  }

  /* 变式①「平均分」：total 个平均分给 d 人，每人几个（知份数求每份） */
  function genShare(s) {
    var r = range(s)
    var q = U.randInt(r.fMin, r.fMax) // 每份
    var d = U.randInt(r.fMin, r.fMax) // 份数
    var total = q * d
    var it = U.pick(U.ITEMS)
    return {
      topic: 'chufa',
      variant: 'share',
      stem: total + ' ' + it.u + it.n + '，平均分给 ' + d + ' 个小朋友，每人分到几' + it.u + it.n + '？',
      answer: q,
      unit: it.u,
      ansLabel: '答：每人分到',
      ansSuffix: it.u + it.n + '。',
      solution: [
        { tag: '想一想', text: '平均分就是每人一样多：把 ' + total + ' ' + it.u + '分成 ' + d + ' 份，求一份是多少。' },
        { tag: '列算式', text: total + ' ÷ ' + d + ' = ' + q + '（' + it.u + '）。' },
        { tag: '验一验', text: q + ' × ' + d + ' = ' + total + '，' + d + ' 个人每人 ' + q + ' ' + it.u + '，正好分完 ✓' },
        { tag: '答', text: '每人分到 ' + q + ' ' + it.u + it.n + '。' }
      ],
      key: 'share:' + total + ',' + d
    }
  }

  /* 变式②「包含分」：total 个每 k 个一袋，装几袋（知每份求份数） */
  function genGroup(s) {
    var r = range(s)
    var k = U.randInt(r.fMin, r.fMax) // 每份
    var g = U.randInt(r.fMin, r.fMax) // 份数
    var total = k * g
    var it = U.pick(U.ITEMS)
    return {
      topic: 'chufa',
      variant: 'group',
      stem: total + ' ' + it.u + it.n + '，每 ' + k + ' ' + it.u + '装一袋，能装几袋？',
      answer: g,
      unit: '袋',
      ansLabel: '答：能装',
      ansSuffix: '袋。',
      solution: [
        { tag: '想一想', text: '这回知道的是「每袋 ' + k + ' ' + it.u + '」，求能装几袋——就是数 ' + total + ' 里面有几个 ' + k + '。' },
        { tag: '列算式', text: total + ' ÷ ' + k + ' = ' + g + '（袋）。' },
        { tag: '比一比', text: '和平均分不一样：平均分是知道份数求每份，这里是知道每份求份数——算式都是除法。' },
        { tag: '验一验', text: k + ' × ' + g + ' = ' + total + '，' + g + ' 袋每袋 ' + k + ' ' + it.u + '，正好装完 ✓' },
        { tag: '答', text: '能装 ' + g + ' 袋。' }
      ],
      key: 'group:' + total + ',' + k
    }
  }

  /* 变式③「倍数关系」：A 的数量是 B 的 t 倍，知 A 求 B */
  function genTimes(s) {
    var r = range(s)
    var m = U.randInt(r.fMin, r.fMax) // B 的数量
    var t = U.randInt(2, r.fMax) // 倍数
    var total = m * t
    var who = U.pickTwoNames()
    var A = who[0]
    var B = who[1]
    var it = U.pick(U.ITEMS)
    return {
      topic: 'chufa',
      variant: 'times',
      stem: A + '有 ' + total + ' ' + it.u + it.n + '，正好是' + B + '的 ' + t + ' 倍。' + B + '有几' + it.u + it.n + '？',
      answer: m,
      unit: it.u,
      ansLabel: '答：' + B + '有',
      ansSuffix: it.u + it.n + '。',
      solution: [
        { tag: '想一想', text: A + '的' + it.n + '是' + B + '的 ' + t + ' 倍，意思是' + A + '的数量 = ' + t + ' 个' + B + '的数量——把 ' + total + ' 分成 ' + t + ' 份，一份就是' + B + '的。' },
        { tag: '列算式', text: total + ' ÷ ' + t + ' = ' + m + '（' + it.u + '）。' },
        { tag: '验一验', text: m + ' × ' + t + ' = ' + total + '，正好是' + A + '的数量 ✓' },
        { tag: '答', text: B + '有 ' + m + ' ' + it.u + it.n + '。' }
      ],
      key: 'times:' + total + ',' + t
    }
  }

  var CHUFA = {
    id: 'chufa',
    no: '25',
    stage: 'L2',
    name: '除法的三层含义',
    lesson: {
      title: '除法的三层含义 · 方法讲解',
      sections: [
        {
          heading: '这是什么问题？',
          paras: ['同一个除法算式 12 ÷ 3 = 4，能回答三种完全不同的问题。分清楚题目问的是哪一种，除法才算真的学会了。']
        },
        {
          heading: '怎么想？',
          paras: [
            '① 平均分：12 个苹果平均分给 3 人，每人几个？——知道份数，求每份。',
            '② 包含分：12 个苹果每 3 个装一袋，能装几袋？——知道每份，求份数。',
            '③ 倍数：哥哥的 12 张卡片是妹妹的 3 倍，妹妹几张？——把「3 倍」当成 3 份。三种问法，算式都是 12 ÷ 3 = 4。'
          ]
        },
        {
          heading: '例题示范',
          example: {
            stem: '18 张贴纸，每 6 张装一袋，能装几袋？',
            solution: [
              { tag: '想一想', text: '知道每袋 6 张，求份数——数一数 18 里面有几个 6。' },
              { tag: '列算式', text: '18 ÷ 6 = 3（袋）。' },
              { tag: '验一验', text: '6 × 3 = 18，正好装完 ✓' },
              { tag: '答', text: '能装 3 袋。' }
            ]
          }
        },
        { heading: '记住口诀', chant: '每份、几份、还是几倍？想清再除错不了。' }
      ]
    },
    variants: [
      { id: 'share', setting: 'vChShare', label: '平均分（求每份）', gen: genShare },
      { id: 'group', setting: 'vChGroup', label: '包含分（求份数）', gen: genGroup },
      { id: 'times', setting: 'vChTimes', label: '倍数关系（求一倍数）', def: false, gen: genTimes }
    ],
    generate: function (s) {
      return U.generateFrom(CHUFA.variants, s)
    },
    titleFor: function (s) {
      return '除法三层含义练习 · ' + U.DIFF_LABEL[s.difficulty]
    }
  }

  root.SumSum.aoshu.topics.chufa = CHUFA
  root.SumSum.aoshu.topicList.push(CHUFA)
})(typeof window !== 'undefined' ? window : globalThis)
