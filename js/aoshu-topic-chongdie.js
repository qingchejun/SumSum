/**
 * 知识点「11 重叠问题」：两个组里都有的人（或重叠的长度）被算了两次，要减掉一次。
 * 变式：①两样都参加求总人数 ②纸条重叠求总长 ③反求重叠人数（稍难默认关）。
 * 全部反向构造：先定「只A/只B/重叠」三块再拼出题面数字，天然合法。
 */
(function (root) {
  'use strict'

  var U = root.SumSum.aoshu.util

  /* 活动对都用两字词，圆点图的行标签才对得整齐 */
  var ACTS = [
    ['画画', '唱歌'],
    ['跳绳', '踢毽'],
    ['足球', '篮球'],
    ['下棋', '跑步']
  ]

  /* 两行圆点图：每行末尾的 ○ 是同一批「两样都参加」的人；行太长就不画 */
  function overlapDiagram(actA, actB, onlyA, onlyB, c) {
    if (onlyA + c > 20 || onlyB + c > 20) return null
    return {
      rows: [
        { label: actA, groups: [{ type: 'solid', n: onlyA }, { type: 'hollow', n: c }] },
        { label: actB, groups: [{ type: 'solid', n: onlyB }, { type: 'hollow', n: c }] }
      ],
      note: '两行末尾的 ○ 是同 ' + c + ' 个人——两样都参加，只能数一次'
    }
  }

  /* 变式①：两样都参加 c 人，求参加活动的总人数 = a + b − c */
  function genBoth(s) {
    var cap = U.diff(s).numMax
    var c = U.randInt(1, Math.max(1, Math.floor(cap / 3)))
    if (cap - c - 2 < 0) return null
    var onlyA = U.randInt(1, cap - c - 1)
    var onlyB = U.randInt(1, cap - c - onlyA)
    var a = onlyA + c
    var b = onlyB + c
    var total = onlyA + onlyB + c
    var act = U.pick(ACTS)
    return {
      topic: 'chongdie',
      variant: 'both',
      stem:
        '参加' + act[0] + '的有 ' + a + ' 人，参加' + act[1] + '的有 ' + b +
        ' 人，两样都参加的有 ' + c + ' 人。参加活动的一共有几人？',
      answer: total,
      unit: '人',
      ansLabel: '答：参加活动的一共有',
      ansSuffix: '人。',
      diagram: overlapDiagram(act[0], act[1], onlyA, onlyB, c),
      solution: [
        { tag: '想一想', text: '两样都参加的 ' + c + ' 人，数' + act[0] + '时数了一次，数' + act[1] + '时又数了一次——被数了两次，要减掉一次。' },
        { tag: '列算式', text: '先加：' + a + ' + ' + b + ' = ' + (a + b) + '（人）；再把多数的一次减掉：' + (a + b) + ' − ' + c + ' = ' + total + '（人）。' },
        { tag: '验一验', text: '分开数：只' + act[0] + '的 ' + onlyA + ' 人 + 两样都参加的 ' + c + ' 人 + 只' + act[1] + '的 ' + onlyB + ' 人 = ' + total + ' 人 ✓' },
        { tag: '答', text: '参加活动的一共有 ' + total + ' 人。' }
      ],
      key: 'both:' + a + ',' + b + ',' + c
    }
  }

  /* 变式②：两根纸条重叠 c 厘米，粘好后总长 = a + b − c */
  function genPaper(s) {
    var cap = U.diff(s).numMax
    if (cap < 10) return null
    var total = U.randInt(8, cap)
    var c = U.randInt(1, Math.min(6, total - 2))
    var a = U.randInt(c + 1, total - 1)
    var b = total + c - a
    if (b <= c || a > cap || b > cap) return null
    return {
      topic: 'chongdie',
      variant: 'paper',
      stem:
        '两根纸条分别长 ' + a + ' 厘米和 ' + b + ' 厘米，粘在一起时中间重叠了 ' + c +
        ' 厘米。粘好后的纸条一共长多少厘米？',
      answer: total,
      unit: '厘米',
      ansLabel: '答：粘好后一共长',
      ansSuffix: '厘米。',
      solution: [
        { tag: '想一想', text: '重叠的 ' + c + ' 厘米，量第一根时算了一次，量第二根时又算了一次——多算了一次。' },
        { tag: '列算式', text: '先加：' + a + ' + ' + b + ' = ' + (a + b) + '（厘米）；再减掉多算的重叠：' + (a + b) + ' − ' + c + ' = ' + total + '（厘米）。' },
        { tag: '验一验', text: '分段量：左边露出 ' + (a - c) + ' 厘米 + 重叠 ' + c + ' 厘米 + 右边露出 ' + (b - c) + ' 厘米 = ' + total + ' 厘米 ✓' },
        { tag: '答', text: '粘好后一共长 ' + total + ' 厘米。' }
      ],
      key: 'paper:' + a + ',' + b + ',' + c
    }
  }

  /* 变式③（稍难）：已知总人数，反求两样都参加的人数 = a + b − t */
  function genFind(s) {
    var cap = U.diff(s).numMax
    var c = U.randInt(1, Math.max(1, Math.floor(cap / 3)))
    if (cap - c - 2 < 0) return null
    var onlyA = U.randInt(1, cap - c - 1)
    var onlyB = U.randInt(1, cap - c - onlyA)
    var a = onlyA + c
    var b = onlyB + c
    var t = onlyA + onlyB + c
    var act = U.pick(ACTS)
    return {
      topic: 'chongdie',
      variant: 'find',
      stem:
        '参加' + act[0] + '的有 ' + a + ' 人，参加' + act[1] + '的有 ' + b +
        ' 人，参加活动的一共只有 ' + t + ' 人。两样都参加的有几人？',
      answer: c,
      unit: '人',
      ansLabel: '答：两样都参加的有',
      ansSuffix: '人。',
      solution: [
        { tag: '想一想', text: '把两组直接加起来：' + a + ' + ' + b + ' = ' + (a + b) + '（人），比实际的 ' + t + ' 人多——多出来的就是被数了两次的人。' },
        { tag: '列算式', text: (a + b) + ' − ' + t + ' = ' + c + '（人）。' },
        { tag: '验一验', text: '两样都参加 ' + c + ' 人，那么只' + act[0] + '的 ' + onlyA + ' 人、只' + act[1] + '的 ' + onlyB + ' 人：' + onlyA + ' + ' + c + ' + ' + onlyB + ' = ' + t + ' 人，正好 ✓' },
        { tag: '答', text: '两样都参加的有 ' + c + ' 人。' }
      ],
      key: 'find:' + a + ',' + b + ',' + t
    }
  }

  var CHONGDIE = {
    id: 'chongdie',
    no: '11',
    stage: 'L1',
    name: '重叠问题',
    lesson: {
      title: '重叠问题 · 方法讲解',
      sections: [
        {
          heading: '这是什么问题？',
          paras: ['两个组里都有的人（或者粘在一起的两段长度），加起来的时候一不小心就会算两次。重叠问题练的就是：把「被数了两次的」减掉一次。']
        },
        {
          heading: '怎么想？',
          paras: ['先把两组直接加起来，再停下来想一想：有没有人（或有没有一段）被加了两次？有的话，把多加的那一次减掉。'],
          diagram: {
            rows: [
              { label: '画画', groups: [{ type: 'solid', n: 3 }, { type: 'hollow', n: 2 }] },
              { label: '唱歌', groups: [{ type: 'solid', n: 2 }, { type: 'hollow', n: 2 }] }
            ],
            note: '两行末尾的 ○ 是同 2 个人：画画 5 人 + 唱歌 4 人，其中 2 人算了两次'
          }
        },
        {
          heading: '例题示范',
          example: {
            stem: '参加画画的有 5 人，参加唱歌的有 4 人，两样都参加的有 2 人。参加活动的一共有几人？',
            solution: [
              { tag: '想一想', text: '两样都参加的 2 人，数画画时数了一次，数唱歌时又数了一次——被数了两次。' },
              { tag: '列算式', text: '先加：5 + 4 = 9（人）；再把多数的一次减掉：9 − 2 = 7（人）。' },
              { tag: '验一验', text: '分开数：只画画 3 人 + 都参加 2 人 + 只唱歌 2 人 = 7 人 ✓' },
              { tag: '答', text: '参加活动的一共有 7 人。' }
            ]
          }
        },
        { heading: '记住口诀', chant: '两组加起来，重叠减一次。' }
      ]
    },
    variants: [
      { id: 'both', setting: 'vCdBoth', label: '两样都参加，求总人数', gen: genBoth },
      { id: 'paper', setting: 'vCdPaper', label: '纸条重叠，求总长', gen: genPaper },
      { id: 'find', setting: 'vCdFind', label: '反求重叠人数', def: false, gen: genFind }
    ],
    generate: function (s) {
      return U.generateFrom(CHONGDIE.variants, s)
    },
    titleFor: function (s) {
      return '重叠问题练习 · ' + U.diff(s).numMax + '以内'
    }
  }

  root.SumSum.aoshu.topics.chongdie = CHONGDIE
  root.SumSum.aoshu.topicList.push(CHONGDIE)
})(typeof window !== 'undefined' ? window : globalThis)
