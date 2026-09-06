/**
 * 知识点「37 线段图应用（一）」：和差问题——两人合起来多少、相差多少，求各自多少。
 * 线段图（diagramHTML，用 css/aoshu.css 的 .seg-diagram 样式）是解析的灵魂：
 * 图上只画结构（未知段打「？」），不标答案数值。
 * 构造顺序：先取小数 b 和差 d → 大数 a=b+d、和 s=a+b，答案天然自洽；
 * 自测用 a+b=s、a−b=d 代回独立验证。
 */
(function (root) {
  'use strict'

  var U = root.SumSum.aoshu.util

  /* 各难度档：和的上限 */
  var CAP = { L1: 20, L2: 50, L3: 100 }

  function cap(s) {
    return CAP[s.difficulty] || CAP.L1
  }

  /* 取一组 {A, B, a, b, d, s, item}：A 是多的一方 */
  function pickCase(s) {
    var c = cap(s)
    var b = U.randInt(2, Math.floor(c / 2) - 1)
    var d = U.randInt(1, Math.max(1, Math.floor(c / 3)))
    var a = b + d
    if (a + b > c) return null
    var who = U.pickTwoNames()
    return { A: who[0], B: who[1], a: a, b: b, d: d, s: a + b, item: U.pick(U.ITEMS) }
  }

  /*
   * 和差线段图：两行——少的一段「？」，多的同宽一段「？」+「多 d」一小段，
   * 图注写「两人合起来共 s」。宽度按数值比例取 mm（最长约 70mm），
   * 太窄的段给最小宽度保证文字放得下（示意图允许不完全成比例）。
   */
  function segDiagram(c) {
    var unit = 70 / c.a
    var wb = Math.max(c.b * unit, 6).toFixed(1)
    var wd = Math.max(c.d * unit, 10).toFixed(1)
    var u = c.item.u
    return (
      '<div class="seg-diagram">' +
      '<div class="seg-row"><span class="seg-label">' + c.B + '</span>' +
      '<span class="seg" style="width:' + wb + 'mm">？</span></div>' +
      '<div class="seg-row"><span class="seg-label">' + c.A + '</span>' +
      '<span class="seg" style="width:' + wb + 'mm">？</span>' +
      '<span class="seg" style="width:' + wd + 'mm">多 ' + c.d + ' ' + u + '</span></div>' +
      '<div class="seg-note">两人合起来一共 ' + c.s + ' ' + u + c.item.n + '</div>' +
      '</div>'
    )
  }

  /* 共用的题干：合起来 s，A 比 B 多 d */
  function stemOf(c, ask) {
    return (
      c.A + '和' + c.B + '一共有 ' + c.s + ' ' + c.item.u + c.item.n + '，' +
      c.A + '比' + c.B + '多 ' + c.d + ' ' + c.item.u + '。' + ask + '有几' + c.item.u + c.item.n + '？'
    )
  }

  /* 变式①和差求大数 */
  function genBig(s) {
    var c = pickCase(s)
    if (!c) return null
    var u = c.item.u
    return {
      topic: 'xianduan1',
      variant: 'big',
      stem: stemOf(c, c.A),
      answer: c.a,
      unit: u,
      ansLabel: '答：' + c.A + '有',
      ansSuffix: u + c.item.n + '。',
      diagramHTML: segDiagram(c),
      solution: [
        { tag: '画一画', text: '把两人的' + c.item.n + '画成线段（见上图）：' + c.B + '一段，' + c.A + '是同样的一段再多出 ' + c.d + ' ' + u + '。' },
        { tag: '想一想', text: '把' + c.A + '多出来的 ' + c.d + ' ' + u + '先拿走，剩下的正好是两段一样长的。' },
        { tag: '第 1 步', text: c.s + ' − ' + c.d + ' = ' + (c.s - c.d) + '（' + u + '），这是两个' + c.B + '的数量。' },
        { tag: '第 2 步', text: '把 ' + (c.s - c.d) + ' 平分成两份：' + c.B + '有 ' + c.b + ' ' + u + '。' },
        { tag: '第 3 步', text: c.A + ' = ' + c.b + ' + ' + c.d + ' = ' + c.a + '（' + u + '）。' },
        { tag: '验一验', text: c.a + ' + ' + c.b + ' = ' + c.s + ' ✓，' + c.a + ' − ' + c.b + ' = ' + c.d + ' ✓，两个条件都对上了。' },
        { tag: '答', text: c.A + '有 ' + c.a + ' ' + u + c.item.n + '。' }
      ],
      key: 'big:' + c.s + ',' + c.d
    }
  }

  /* 变式②和差求小数 */
  function genSmall(s) {
    var c = pickCase(s)
    if (!c) return null
    var u = c.item.u
    return {
      topic: 'xianduan1',
      variant: 'small',
      stem: stemOf(c, c.B),
      answer: c.b,
      unit: u,
      ansLabel: '答：' + c.B + '有',
      ansSuffix: u + c.item.n + '。',
      diagramHTML: segDiagram(c),
      solution: [
        { tag: '画一画', text: '画线段图（见上图）：' + c.B + '一段，' + c.A + '是同样的一段再多 ' + c.d + ' ' + u + '。' },
        { tag: '想一想', text: '把多出来的 ' + c.d + ' ' + u + '拿走，剩下的就是两段一样长的——正好是两个' + c.B + '。' },
        { tag: '第 1 步', text: c.s + ' − ' + c.d + ' = ' + (c.s - c.d) + '（' + u + '）。' },
        { tag: '第 2 步', text: '把 ' + (c.s - c.d) + ' 平分成两份，每份就是' + c.B + '的数量：' + c.b + ' ' + u + '。' },
        { tag: '验一验', text: c.A + '是 ' + c.b + ' + ' + c.d + ' = ' + c.a + '（' + u + '），' + c.a + ' + ' + c.b + ' = ' + c.s + ' ✓' },
        { tag: '答', text: c.B + '有 ' + c.b + ' ' + u + c.item.n + '。' }
      ],
      key: 'small:' + c.s + ',' + c.d
    }
  }

  /* 变式③移多补少综合：给 k 个后一样多 → 原差是 2k，转成和差求大数 */
  function genMove(s) {
    var c0 = cap(s)
    var k = U.randInt(1, Math.max(1, Math.floor(c0 / 8)))
    var d = 2 * k
    var b = U.randInt(2, Math.floor(c0 / 2) - 1)
    var a = b + d
    if (a + b > c0) return null
    var who = U.pickTwoNames()
    var item = U.pick(U.ITEMS)
    var u = item.u
    var c = { A: who[0], B: who[1], a: a, b: b, d: d, s: a + b, item: item }
    return {
      topic: 'xianduan1',
      variant: 'move',
      stem:
        c.A + '和' + c.B + '一共有 ' + c.s + ' ' + u + item.n + '。' + c.A + '给了' + c.B + ' ' + k + ' ' + u +
        '以后，两人正好一样多。' + c.A + '原来有几' + u + item.n + '？',
      answer: a,
      unit: u,
      ansLabel: '答：' + c.A + '原来有',
      ansSuffix: u + item.n + '。',
      diagramHTML: segDiagram(c),
      solution: [
        { tag: '想一想', text: '给 ' + k + ' ' + u + '正好补平——移多补少学过：说明' + c.A + '原来比' + c.B + '多两个 ' + k + '，也就是 ' + k + ' + ' + k + ' = ' + d + '（' + u + '）。' },
        { tag: '画一画', text: '现在变成了和差问题（见上图）：一共 ' + c.s + ' ' + u + '，' + c.A + '多 ' + d + ' ' + u + '。' },
        { tag: '第 1 步', text: c.s + ' − ' + d + ' = ' + (c.s - d) + '（' + u + '），平分成两份得' + c.B + '：' + b + ' ' + u + '。' },
        { tag: '第 2 步', text: c.A + ' = ' + b + ' + ' + d + ' = ' + a + '（' + u + '）。' },
        { tag: '验一验', text: c.A + '给出 ' + k + ' ' + u + '后是 ' + (a - k) + ' ' + u + '，' + c.B + '收到后是 ' + (b + k) + ' ' + u + '，一样多 ✓' },
        { tag: '答', text: c.A + '原来有 ' + a + ' ' + u + item.n + '。' }
      ],
      key: 'move:' + c.s + ',' + k
    }
  }

  var XIANDUAN1 = {
    id: 'xianduan1',
    no: '37',
    stage: 'L2',
    name: '线段图应用（一）',
    lesson: {
      title: '线段图（和差问题） · 方法讲解',
      sections: [
        {
          heading: '这是什么问题？',
          paras: ['知道两个人「合起来多少」和「相差多少」，求各自有多少。数字在脑子里绕不清时，画两条线段一比，一眼就看明白。']
        },
        {
          heading: '怎么想？',
          paras: ['少的画一段，多的画同样的一段再接一小截「多出来的」。把多出来的截掉，剩下的就是两段一样长——平分它，就求出了少的那个。'],
          diagramHTML:
            '<div class="seg-diagram">' +
            '<div class="seg-row"><span class="seg-label">妹妹</span><span class="seg" style="width:28mm">？</span></div>' +
            '<div class="seg-row"><span class="seg-label">哥哥</span><span class="seg" style="width:28mm">？</span><span class="seg" style="width:14mm">多 4 张</span></div>' +
            '<div class="seg-note">两人合起来一共 16 张</div>' +
            '</div>'
        },
        {
          heading: '例题示范',
          example: {
            stem: '哥哥和妹妹一共有 16 张卡片，哥哥比妹妹多 4 张。妹妹有几张？',
            solution: [
              { tag: '想一想', text: '把哥哥多出来的 4 张先拿走，剩下的就是两段一样长的。' },
              { tag: '第 1 步', text: '16 − 4 = 12（张），这是两个妹妹的数量。' },
              { tag: '第 2 步', text: '把 12 平分成两份：妹妹有 6 张。' },
              { tag: '验一验', text: '哥哥是 6 + 4 = 10（张），10 + 6 = 16 ✓，10 − 6 = 4 ✓' },
              { tag: '答', text: '妹妹有 6 张卡片。' }
            ]
          }
        },
        { heading: '记住口诀', chant: '一多一少画两段，截掉多的再平分；先把小的算出来，加回差数是大数。' }
      ]
    },
    variants: [
      { id: 'big', setting: 'vXd1Big', label: '和差求大数', gen: genBig },
      { id: 'small', setting: 'vXd1Small', label: '和差求小数', gen: genSmall },
      { id: 'move', setting: 'vXd1Move', label: '移多补少综合', def: false, gen: genMove }
    ],
    generate: function (s) {
      return U.generateFrom(XIANDUAN1.variants, s)
    },
    titleFor: function (s) {
      return '线段图·和差问题练习 · ' + CAP[s.difficulty] + '以内'
    }
  }

  root.SumSum.aoshu.topics.xianduan1 = XIANDUAN1
  root.SumSum.aoshu.topicList.push(XIANDUAN1)
})(typeof window !== 'undefined' ? window : globalThis)
