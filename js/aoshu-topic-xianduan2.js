/**
 * 知识点「38 线段图应用（二）」：倍数问题（和倍、差倍）。
 * 核心思想：把「一倍数」画成一段，几倍就画几段，看看总量/差里共有几段。
 * 构造顺序：先取一倍数 b 和倍数 k → 和 s=b×(k+1)、差 d=b×(k−1)，
 * 自测用 b×k 与 s/d 代回独立验证。线段图（diagramHTML）不标答案数值。
 */
(function (root) {
  'use strict'

  var U = root.SumSum.aoshu.util

  /* 各难度档：总量上限与倍数范围 */
  var RANGE = {
    L1: { cap: 20, k: [2, 4] },
    L2: { cap: 50, k: [2, 5] },
    L3: { cap: 100, k: [3, 6] }
  }

  function conf(s) {
    return RANGE[s.difficulty] || RANGE.L1
  }

  /* 场景池：big 是多的一方（k 倍），small 是一倍数一方 */
  var SCENES = [
    { big: '苹果树', small: '梨树', u: '棵', place: '果园里' },
    { big: '故事书', small: '图画书', u: '本', place: '图书角里' },
    { big: '白兔', small: '灰兔', u: '只', place: '养兔场里' },
    { big: '红金鱼', small: '黑金鱼', u: '条', place: '鱼缸里' },
    { big: '大巴车', small: '小轿车', u: '辆', place: '停车场里' }
  ]

  /*
   * 倍数线段图：一倍数一段「？」，多的一方画 k 段同宽。
   * 段宽统一取 min(18, 70/k) mm，示意比例，不标数值。
   */
  function timesDiagram(scene, k, noteText) {
    var w = Math.min(18, 70 / k).toFixed(1)
    var segs = []
    for (var i = 0; i < k; i++) segs.push('<span class="seg" style="width:' + w + 'mm">？</span>')
    return (
      '<div class="seg-diagram">' +
      '<div class="seg-row"><span class="seg-label">' + scene.small + '</span>' +
      '<span class="seg" style="width:' + w + 'mm">？</span></div>' +
      '<div class="seg-row"><span class="seg-label">' + scene.big + '</span>' + segs.join('') + '</div>' +
      '<div class="seg-note">' + noteText + '</div>' +
      '</div>'
    )
  }

  /* 变式①和倍：一共 s，big 是 small 的 k 倍，求一倍数 */
  function genSumTimes(s) {
    var c = conf(s)
    var k = U.randInt(c.k[0], c.k[1])
    var b = U.randInt(2, 9)
    var sum = b * (k + 1)
    if (sum > c.cap || b * k > 81) return null
    var sc = U.pick(SCENES)
    return {
      topic: 'xianduan2',
      variant: 'sumtimes',
      stem:
        sc.place + sc.big + '的数量是' + sc.small + '的 ' + k + ' 倍，两种一共有 ' + sum + ' ' + sc.u + '。' +
        sc.small + '有几' + sc.u + '？',
      answer: b,
      unit: sc.u,
      ansLabel: '答：' + sc.small + '有',
      ansSuffix: sc.u + '。',
      diagramHTML: timesDiagram(sc, k, '两种合起来一共 ' + sum + ' ' + sc.u),
      solution: [
        { tag: '画一画', text: '把' + sc.small + '画成一段（见上图），' + sc.big + '是它的 ' + k + ' 倍，就画 ' + k + ' 段一样长的。' },
        { tag: '想一想', text: '两行合起来一共是 ' + k + ' + 1 = ' + (k + 1) + ' 段一样长的，总数 ' + sum + ' ' + sc.u + '正好分给这 ' + (k + 1) + ' 段。' },
        { tag: '列算式', text: sum + ' ÷ ' + (k + 1) + ' = ' + b + '（' + sc.u + '）。' },
        { tag: '验一验', text: sc.big + '有 ' + b + ' × ' + k + ' = ' + b * k + '（' + sc.u + '），' + b * k + ' + ' + b + ' = ' + sum + ' ✓' },
        { tag: '答', text: sc.small + '有 ' + b + ' ' + sc.u + '。' }
      ],
      key: 'sumtimes:' + sum + ',' + k
    }
  }

  /* 变式②差倍：big 比 small 多 d，big 是 small 的 k 倍，求一倍数 */
  function genDiffTimes(s) {
    var c = conf(s)
    var k = U.randInt(Math.max(2, c.k[0]), c.k[1])
    var b = U.randInt(2, 9)
    var d = b * (k - 1)
    if (d > c.cap || b * k > 81) return null
    var sc = U.pick(SCENES)
    return {
      topic: 'xianduan2',
      variant: 'difftimes',
      stem:
        sc.place + sc.big + '的数量是' + sc.small + '的 ' + k + ' 倍，' + sc.big + '比' + sc.small + '多 ' + d + ' ' + sc.u + '。' +
        sc.small + '有几' + sc.u + '？',
      answer: b,
      unit: sc.u,
      ansLabel: '答：' + sc.small + '有',
      ansSuffix: sc.u + '。',
      diagramHTML: timesDiagram(sc, k, sc.big + '比' + sc.small + '多 ' + d + ' ' + sc.u),
      solution: [
        { tag: '画一画', text: sc.small + '画一段，' + sc.big + '画 ' + k + ' 段一样长的（见上图）。' },
        { tag: '想一想', text: sc.big + '比' + sc.small + '多出的部分，正好是 ' + k + ' − 1 = ' + (k - 1) + ' 段——多出来的 ' + d + ' ' + sc.u + '就摊在这 ' + (k - 1) + ' 段上。' },
        { tag: '列算式', text: d + ' ÷ ' + (k - 1) + ' = ' + b + '（' + sc.u + '）。' },
        { tag: '验一验', text: sc.big + '有 ' + b + ' × ' + k + ' = ' + b * k + '（' + sc.u + '），' + b * k + ' − ' + b + ' = ' + d + ' ✓' },
        { tag: '答', text: sc.small + '有 ' + b + ' ' + sc.u + '。' }
      ],
      key: 'difftimes:' + d + ',' + k
    }
  }

  /* 变式③求大数：和倍/差倍随机出，问 k 倍的那一方 */
  function genBoth(s) {
    var c = conf(s)
    var k = U.randInt(Math.max(2, c.k[0]), c.k[1])
    var b = U.randInt(2, 9)
    var useSum = Math.random() < 0.5
    var sc = U.pick(SCENES)
    var big = b * k
    if (big > 81) return null
    var given, givenText, firstStep
    if (useSum) {
      given = b * (k + 1)
      if (given > c.cap) return null
      givenText = '两种一共有 ' + given + ' ' + sc.u
      firstStep = given + ' ÷ ' + (k + 1) + ' = ' + b + '（' + sc.u + '），先求出一倍数——' + sc.small + '的数量。'
    } else {
      given = b * (k - 1)
      if (given > c.cap) return null
      givenText = sc.big + '比' + sc.small + '多 ' + given + ' ' + sc.u
      firstStep = given + ' ÷ ' + (k - 1) + ' = ' + b + '（' + sc.u + '），先求出一倍数——' + sc.small + '的数量。'
    }
    return {
      topic: 'xianduan2',
      variant: 'both',
      stem:
        sc.place + sc.big + '的数量是' + sc.small + '的 ' + k + ' 倍，' + givenText + '。' +
        sc.big + '有几' + sc.u + '？',
      answer: big,
      unit: sc.u,
      ansLabel: '答：' + sc.big + '有',
      ansSuffix: sc.u + '。',
      diagramHTML: timesDiagram(sc, k, givenText),
      solution: [
        { tag: '画一画', text: sc.small + '画一段，' + sc.big + '画 ' + k + ' 段一样长的（见上图）。' },
        { tag: '第 1 步', text: firstStep },
        { tag: '第 2 步', text: sc.big + '是 ' + k + ' 段：' + b + ' × ' + k + ' = ' + big + '（' + sc.u + '）。' },
        {
          tag: '验一验',
          text: useSum
            ? big + ' + ' + b + ' = ' + (big + b) + '（' + sc.u + '），和题目给的总数一样 ✓'
            : big + ' − ' + b + ' = ' + (big - b) + '（' + sc.u + '），和题目给的相差数一样 ✓'
        },
        { tag: '答', text: sc.big + '有 ' + big + ' ' + sc.u + '。' }
      ],
      key: 'both:' + (useSum ? 's' : 'd') + given + ',' + k
    }
  }

  var XIANDUAN2 = {
    id: 'xianduan2',
    no: '38',
    stage: 'L2',
    name: '线段图应用（二）',
    lesson: {
      title: '线段图（倍数问题） · 方法讲解',
      sections: [
        {
          heading: '这是什么问题？',
          paras: ['「甲是乙的 3 倍」这种话，光看数字容易晕。把「一倍」画成一段线段，3 倍就是 3 段——总数有几段、相差几段，一下子就看清了。']
        },
        {
          heading: '怎么想？',
          paras: ['关键就一句：先找到「一倍数」是谁，把它画成一段。另一个量是它的几倍就画几段。然后数一数：总和占几段？相差占几段？用除法把一段（一倍数）求出来。'],
          diagramHTML:
            '<div class="seg-diagram">' +
            '<div class="seg-row"><span class="seg-label">梨树</span><span class="seg" style="width:17mm">？</span></div>' +
            '<div class="seg-row"><span class="seg-label">苹果树</span><span class="seg" style="width:17mm">？</span><span class="seg" style="width:17mm">？</span><span class="seg" style="width:17mm">？</span></div>' +
            '<div class="seg-note">两种合起来一共 12 棵 → 一共 4 段一样长</div>' +
            '</div>'
        },
        {
          heading: '例题示范',
          example: {
            stem: '果园里苹果树的数量是梨树的 3 倍，两种树一共有 12 棵。梨树有几棵？',
            solution: [
              { tag: '画一画', text: '梨树画一段，苹果树是 3 倍，画 3 段一样长的。' },
              { tag: '想一想', text: '合起来一共 3 + 1 = 4 段，12 棵正好分给 4 段。' },
              { tag: '列算式', text: '12 ÷ 4 = 3（棵）。' },
              { tag: '验一验', text: '苹果树 3 × 3 = 9（棵），9 + 3 = 12 ✓' },
              { tag: '答', text: '梨树有 3 棵。' }
            ]
          }
        },
        { heading: '记住口诀', chant: '一倍画一段，几倍画几段；数清有几段，除法算一段。' }
      ]
    },
    variants: [
      { id: 'sumtimes', setting: 'vXd2SumTimes', label: '和倍问题', gen: genSumTimes },
      { id: 'difftimes', setting: 'vXd2DiffTimes', label: '差倍问题', gen: genDiffTimes },
      { id: 'both', setting: 'vXd2Both', label: '求几倍的那个数', def: false, gen: genBoth }
    ],
    generate: function (s) {
      return U.generateFrom(XIANDUAN2.variants, s)
    },
    titleFor: function (s) {
      return '线段图·倍数问题练习 · ' + U.DIFF_LABEL[s.difficulty]
    }
  }

  root.SumSum.aoshu.topics.xianduan2 = XIANDUAN2
  root.SumSum.aoshu.topicList.push(XIANDUAN2)
})(typeof window !== 'undefined' ? window : globalThis)
