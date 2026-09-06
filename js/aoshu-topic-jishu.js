/**
 * 知识点「32 图形计数初步」：数线段、数角、数长方形——按顺序分类数，不重不漏。
 * 每题的答案都由生成器独立枚举复算（不是套公式），解析里的分类清单
 * 由 listPairs 统一生成，清单项数与答案在生成时断言一致。
 * 题干配内联 SVG（stemHTML），黑白打印安全。
 */
(function (root) {
  'use strict'

  var U = root.SumSum.aoshu.util

  var LETTERS = 'ABCDEF'
  var CIRCLED = '①②③④⑤⑥'

  /* 各难度档的规模上限（点数/射线数/方格数） */
  var RANGE = {
    L1: { seg: [3, 5], angle: [3, 4], rect: [3, 4] },
    L2: { seg: [3, 5], angle: [3, 5], rect: [3, 4] },
    L3: { seg: [4, 6], angle: [4, 5], rect: [3, 5] }
  }

  function range(s, kind) {
    var r = (RANGE[s.difficulty] || RANGE.L1)[kind]
    return U.randInt(r[0], r[1])
  }

  /*
   * 按「左边一个为一类」列出所有两两组合：names = ['A','B','C','D'] →
   * 清单文本「以 A 为左端点：AB、AC、AD（3 条）；……」，同时返回组合总数，
   * 生成器据此断言清单与答案一致。unit 是量词（条/个），noun 是「左端点/一边」。
   */
  function listPairs(names, noun, unit) {
    var parts = []
    var total = 0
    for (var i = 0; i < names.length - 1; i++) {
      var items = []
      for (var j = i + 1; j < names.length; j++) {
        items.push(names[i] + names[j])
        total++
      }
      parts.push('以 ' + names[i] + ' 为' + noun + '：' + items.join('、') + '（' + items.length + ' ' + unit + '）')
    }
    return { text: parts.join('；'), count: total, terms: names.length - 1 }
  }

  /* 连加算式「3 + 2 + 1 = 6」 */
  function sumExpr(n) {
    var terms = []
    var total = 0
    for (var i = n - 1; i >= 1; i--) {
      terms.push(i)
      total += i
    }
    return terms.join(' + ') + ' = ' + total
  }

  /* 直线上 n 个点的 SVG：横线 + 实心点 + 字母标注 */
  function lineSVG(n) {
    var w = 60 + (n - 1) * 60
    var parts = ['<svg viewBox="0 0 ' + w + ' 46" width="' + (w * 0.55).toFixed(0) + '" height="25" style="vertical-align:middle">']
    parts.push('<line x1="10" y1="16" x2="' + (w - 10) + '" y2="16" stroke="#000" stroke-width="2"/>')
    for (var i = 0; i < n; i++) {
      var x = 30 + i * ((w - 60) / (n - 1))
      parts.push('<circle cx="' + x + '" cy="16" r="4" fill="#000"/>')
      parts.push('<text x="' + x + '" y="42" font-size="16" text-anchor="middle">' + LETTERS[i] + '</text>')
    }
    parts.push('</svg>')
    return parts.join('')
  }

  /* 从一点引出 n 条射线的 SVG：射线摆在 90° 扇形内，末端标 ①②③ */
  function raySVG(n) {
    var parts = ['<svg viewBox="0 0 120 84" width="100" height="70" style="vertical-align:middle">']
    var ox = 12
    var oy = 74
    for (var i = 0; i < n; i++) {
      var deg = (80 / (n - 1)) * i + 5
      var rad = (deg * Math.PI) / 180
      var x = ox + 88 * Math.cos(rad)
      var y = oy - 88 * Math.sin(rad)
      var lx = ox + 100 * Math.cos(rad)
      var ly = oy - 100 * Math.sin(rad)
      parts.push('<line x1="' + ox + '" y1="' + oy + '" x2="' + x.toFixed(1) + '" y2="' + y.toFixed(1) + '" stroke="#000" stroke-width="2"/>')
      parts.push('<text x="' + lx.toFixed(1) + '" y="' + (ly + 5).toFixed(1) + '" font-size="13" text-anchor="middle">' + CIRCLED[i] + '</text>')
    }
    parts.push('<circle cx="' + ox + '" cy="' + oy + '" r="3" fill="#000"/>')
    parts.push('</svg>')
    return parts.join('')
  }

  /* 一行 n 个并连方格的 SVG */
  function gridSVG(n) {
    var cell = 34
    var w = n * cell + 8
    var parts = ['<svg viewBox="0 0 ' + w + ' 44" width="' + (w * 0.7).toFixed(0) + '" height="30" style="vertical-align:middle">']
    for (var i = 0; i < n; i++) {
      parts.push('<rect x="' + (4 + i * cell) + '" y="4" width="' + cell + '" height="' + cell + '" fill="#fff" stroke="#000" stroke-width="2"/>')
    }
    parts.push('</svg>')
    return parts.join('')
  }

  /* 变式①数线段：n 个点，答案独立枚举（双重循环数点对） */
  function genSegment(s) {
    var n = range(s, 'seg')
    var names = LETTERS.slice(0, n).split('')
    var count = 0
    for (var i = 0; i < n; i++) for (var j = i + 1; j < n; j++) count++
    var list = listPairs(names, '左端点', '条')
    if (list.count !== count) return null // 清单与枚举必须一致（防御）
    var stem = '直线上有 ' + names.join('、') + ' 这 ' + n + ' 个点，一共能数出几条线段？'
    return {
      topic: 'jishu',
      variant: 'segment',
      stem: stem,
      stemHTML: stem + '<div>' + lineSVG(n) + '</div>',
      answer: count,
      unit: '条',
      ansLabel: '答：一共能数出',
      ansSuffix: '条线段。',
      solution: [
        { tag: '想一想', text: '东一条西一条容易数乱。按「左端点」分类，一类一类数，就不会重也不会漏。' },
        { tag: '列一列', text: list.text + '。' },
        { tag: '列算式', text: sumExpr(n) + '（条）。' },
        { tag: '验一验', text: '每条线段都在清单里出现一次，也只出现一次——不重不漏 ✓' },
        { tag: '答', text: '一共能数出 ' + count + ' 条线段。' }
      ],
      key: 'segment:' + n
    }
  }

  /* 变式②数角：一点引出 n 条射线，任意两条夹一个角 */
  function genAngle(s) {
    var n = range(s, 'angle')
    var names = CIRCLED.slice(0, n).split('')
    var count = 0
    for (var i = 0; i < n; i++) for (var j = i + 1; j < n; j++) count++
    var list = listPairs(names, '一条边', '个')
    if (list.count !== count) return null
    var stem = '从一点引出 ' + n + ' 条射线（如图），一共能数出几个角？'
    return {
      topic: 'jishu',
      variant: 'angle',
      stem: stem,
      stemHTML: stem + '<div>' + raySVG(n) + '</div>',
      answer: count,
      unit: '个',
      ansLabel: '答：一共能数出',
      ansSuffix: '个角。',
      solution: [
        { tag: '想一想', text: '每两条射线就夹出一个角。还是老办法：按「哪条线当一条边」分类数。' },
        { tag: '列一列', text: list.text + '。' },
        { tag: '列算式', text: sumExpr(n) + '（个）。' },
        { tag: '验一验', text: '每个角的两条边都在清单里配过一次对——不重不漏 ✓' },
        { tag: '答', text: '一共能数出 ' + count + ' 个角。' }
      ],
      key: 'angle:' + n
    }
  }

  /* 变式③数长方形：一排并连的 n 个小方格，按「由几个小格拼成」分类 */
  function genRect(s) {
    var n = range(s, 'rect')
    /* 独立枚举：所有连续子段 (i..j) */
    var count = 0
    for (var i = 0; i < n; i++) for (var j = i; j < n; j++) count++
    var parts = []
    var total = 0
    for (var size = 1; size <= n; size++) {
      var c = n - size + 1
      total += c
      parts.push('由 ' + size + ' 个小格拼成的：' + c + ' 个')
    }
    if (total !== count) return null
    var terms = []
    for (var k = n; k >= 1; k--) terms.push(k)
    var stem = '一排连在一起的 ' + n + ' 个小方格（如图），一共能数出几个长方形（正方形也算）？'
    return {
      topic: 'jishu',
      variant: 'rect',
      stem: stem,
      stemHTML: stem + '<div>' + gridSVG(n) + '</div>',
      answer: count,
      unit: '个',
      ansLabel: '答：一共能数出',
      ansSuffix: '个长方形。',
      solution: [
        { tag: '想一想', text: '除了一格一格的小方块，几个小格连在一起也能拼成长方形。按「由几个小格拼成」分类数。' },
        { tag: '列一列', text: parts.join('；') + '。' },
        { tag: '列算式', text: terms.join(' + ') + ' = ' + count + '（个）。' },
        { tag: '验一验', text: '从最小数到最大，每一种大小都数过了——不重不漏 ✓' },
        { tag: '答', text: '一共能数出 ' + count + ' 个长方形。' }
      ],
      key: 'rect:' + n
    }
  }

  var JISHU = {
    id: 'jishu',
    no: '32',
    stage: 'L2',
    name: '图形计数初步',
    lesson: {
      title: '图形计数 · 方法讲解',
      sections: [
        {
          heading: '这是什么问题？',
          paras: ['图里的线段、角、方块，常常比一眼看到的多——几个小的能拼成一个大的。图形计数就是要把它们一个不漏地数出来。']
        },
        {
          heading: '怎么想？',
          paras: [
            '乱数一定会漏。诀窍是「分类数」：数线段就按左端点分类——先数以第一个点开头的，再数以第二个点开头的……',
            '每类的个数会越来越少（3 条、2 条、1 条……），最后把每类加起来。'
          ]
        },
        {
          heading: '例题示范',
          example: {
            stem: '直线上有 A、B、C、D 这 4 个点，一共能数出几条线段？',
            stemHTML: '直线上有 A、B、C、D 这 4 个点，一共能数出几条线段？<div>' + lineSVG(4) + '</div>',
            solution: [
              { tag: '想一想', text: '按「左端点」分类，一类一类数，不重不漏。' },
              { tag: '列一列', text: '以 A 为左端点：AB、AC、AD（3 条）；以 B 为左端点：BC、BD（2 条）；以 C 为左端点：CD（1 条）。' },
              { tag: '列算式', text: '3 + 2 + 1 = 6（条）。' },
              { tag: '验一验', text: '每条线段都数了一次，也只数了一次 ✓' },
              { tag: '答', text: '一共能数出 6 条线段。' }
            ]
          }
        },
        { heading: '记住口诀', chant: '分类来数图，从小数到大；每类记个数，最后加一加。' }
      ]
    },
    variants: [
      { id: 'segment', setting: 'vJsSegment', label: '数线段', gen: genSegment },
      { id: 'angle', setting: 'vJsAngle', label: '数角', gen: genAngle },
      { id: 'rect', setting: 'vJsRect', label: '数长方形', def: false, gen: genRect }
    ],
    generate: function (s) {
      return U.generateFrom(JISHU.variants, s)
    },
    titleFor: function (s) {
      return '图形计数练习 · ' + U.DIFF_LABEL[s.difficulty]
    }
  }

  root.SumSum.aoshu.topics.jishu = JISHU
  root.SumSum.aoshu.topicList.push(JISHU)
})(typeof window !== 'undefined' ? window : globalThis)
