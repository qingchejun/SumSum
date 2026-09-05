/**
 * 知识点「17 排队问题」：数队伍人数，核心是「自己」要么忘了数、要么数了两次。
 * 变式：①前 a 人后 b 人求总数（+1）②从前第 m 从后第 n 求总数（−1）③已知总数求后面几人。
 */
(function (root) {
  'use strict'

  var U = root.SumSum.aoshu.util

  /* 圆点图：前面 front 个 ○ + 自己 ● + 后面 back 个 ○（队伍太长画不下就不画） */
  function queueDiagram(front, back, name, note) {
    if (front + back + 1 > 20) return null
    return {
      rows: [
        {
          label: '队伍',
          groups: [
            { type: 'hollow', n: front },
            { type: 'solid', n: 1 },
            { type: 'hollow', n: back }
          ]
        }
      ],
      note: note
    }
  }

  /* 变式①：前面 a 人、后面 b 人，求总数 = a + b + 1 */
  function genBoth(s) {
    var c = U.diff(s).numMax
    var a = U.randInt(1, c - 2)
    if (c - a - 1 < 1) return null
    var b = U.randInt(1, c - a - 1)
    var total = a + b + 1
    var name = U.pick(U.NAMES)
    var ta = U.pron(name)
    return {
      topic: 'paidui',
      variant: 'both',
      stem: name + '排队买票，' + ta + '前面有 ' + a + ' 个人，后面有 ' + b + ' 个人。这一队一共有多少人？',
      answer: total,
      unit: '人',
      ansLabel: '答：这一队一共有',
      ansSuffix: '人。',
      diagram: queueDiagram(a, b, name, '● 是' + name + '：前面 ' + a + ' 人 + ' + name + ' + 后面 ' + b + ' 人 = ' + total + ' 人'),
      solution: [
        { tag: '想一想', text: '前面的人 + 后面的人，还要加上' + name + '自己——最容易忘的就是' + ta + '自己！' },
        { tag: '列算式', text: a + ' + ' + b + ' + 1 = ' + total + '（人）。' },
        { tag: '验一验', text: '画圈数一数：○ 是别人，● 是' + name + '，一共 ' + total + ' 个圈 ✓' },
        { tag: '答', text: '这一队一共有 ' + total + ' 人。' }
      ],
      key: 'both:' + a + ',' + b
    }
  }

  /* 变式②：从前数第 m、从后数第 n，求总数 = m + n − 1 */
  function genFromBoth(s) {
    var c = U.diff(s).numMax
    var m = U.randInt(2, c - 1)
    if (c + 1 - m < 2) return null
    var n = U.randInt(2, c + 1 - m)
    var total = m + n - 1
    var name = U.pick(U.NAMES)
    var ta = U.pron(name)
    return {
      topic: 'paidui',
      variant: 'fromboth',
      stem: name + '排队做操，从前往后数' + ta + '是第 ' + m + ' 个，从后往前数' + ta + '是第 ' + n + ' 个。这一排一共有多少人？',
      answer: total,
      unit: '人',
      ansLabel: '答：这一排一共有',
      ansSuffix: '人。',
      diagram: queueDiagram(m - 1, n - 1, name, '● 是' + name + '：前面 ' + (m - 1) + ' 人 + ' + name + ' + 后面 ' + (n - 1) + ' 人 = ' + total + ' 人'),
      solution: [
        { tag: '想一想', text: '从前数到' + name + '有 ' + m + ' 人，从后数到' + ta + '有 ' + n + ' 人——' + name + '自己被数了两次，要减掉 1 次。' },
        { tag: '列算式', text: m + ' + ' + n + ' − 1 = ' + total + '（人）。' },
        { tag: '验一验', text: name + '前面有 ' + (m - 1) + ' 人、后面有 ' + (n - 1) + ' 人：' + (m - 1) + ' + 1 + ' + (n - 1) + ' = ' + total + '（人）✓' },
        { tag: '答', text: '这一排一共有 ' + total + ' 人。' }
      ],
      key: 'fromboth:' + m + ',' + n
    }
  }

  /* 变式③：一队共 t 人，从前数第 m，求后面几人 = t − m */
  function genBehind(s) {
    var c = U.diff(s).numMax
    var t = U.randInt(4, c)
    var m = U.randInt(2, t - 1)
    var name = U.pick(U.NAMES)
    var ta = U.pron(name)
    return {
      topic: 'paidui',
      variant: 'behind',
      stem: '一队一共有 ' + t + ' 人，' + name + '从前往后数是第 ' + m + ' 个。' + ta + '后面还有几个人？',
      answer: t - m,
      unit: '人',
      ansLabel: '答：' + ta + '后面还有',
      ansSuffix: '个人。',
      diagram: queueDiagram(m - 1, t - m, name, '● 是' + name + '（第 ' + m + ' 个）：' + ta + '后面还有 ' + (t - m) + ' 人'),
      solution: [
        { tag: '想一想', text: '「第 ' + m + ' 个」的意思是：' + name + '和' + ta + '前面的人合在一起，正好 ' + m + ' 人。剩下的都在' + ta + '后面。' },
        { tag: '列算式', text: t + ' − ' + m + ' = ' + (t - m) + '（人）。' },
        { tag: '验一验', text: '前 ' + m + ' 人（含' + name + '）+ 后面 ' + (t - m) + ' 人 = ' + t + ' 人，正好是全队 ✓' },
        { tag: '答', text: ta + '后面还有 ' + (t - m) + ' 个人。' }
      ],
      key: 'behind:' + t + ',' + m
    }
  }

  var PAIDUI = {
    id: 'paidui',
    no: '17',
    stage: 'L1',
    name: '排队问题',
    lesson: {
      title: '排队问题 · 方法讲解',
      sections: [
        {
          heading: '这是什么问题？',
          paras: ['排队的时候数人数，最容易出两种错：忘了把自己数进去，或者把自己数了两次。排队问题练的就是「数人要数清楚」。']
        },
        {
          heading: '怎么想？',
          paras: ['画圈圈最靠谱：别人画 ○，自己画 ●，一个一个点着数，一眼就清楚。'],
          diagram: {
            rows: [
              {
                label: '队伍',
                groups: [
                  { type: 'hollow', n: 3 },
                  { type: 'solid', n: 1 },
                  { type: 'hollow', n: 4 }
                ]
              }
            ],
            note: '前面 3 人 + 自己 + 后面 4 人 = 8 人'
          }
        },
        {
          heading: '例题示范',
          example: {
            stem: '小明排队买票，他前面有 3 个人，后面有 4 个人。这一队一共有多少人？',
            solution: [
              { tag: '想一想', text: '前面的人 + 后面的人，还要加上小明自己——最容易忘的就是他自己！' },
              { tag: '列算式', text: '3 + 4 + 1 = 8（人）。' },
              { tag: '验一验', text: '画圈数一数：○○○ ● ○○○○，一共 8 个圈 ✓' },
              { tag: '答', text: '这一队一共有 8 人。' }
            ]
          }
        },
        { heading: '记住口诀', chant: '前面加后面，自己别忘算；两头都数了，重复减一遍。' }
      ]
    },
    variants: [
      { id: 'both', setting: 'vPdBoth', label: '前 a 人后 b 人，求总数', gen: genBoth },
      { id: 'fromboth', setting: 'vPdFromBoth', label: '从前第 m、从后第 n，求总数', gen: genFromBoth },
      { id: 'behind', setting: 'vPdBehind', label: '已知总数，求后面几人', gen: genBehind }
    ],
    generate: function (s) {
      return U.generateFrom(PAIDUI.variants, s)
    },
    titleFor: function (s) {
      return '排队问题练习 · ' + U.diff(s).numMax + '以内'
    }
  }

  root.SumSum.aoshu.topics.paidui = PAIDUI
  root.SumSum.aoshu.topicList.push(PAIDUI)
})(typeof window !== 'undefined' ? window : globalThis)
