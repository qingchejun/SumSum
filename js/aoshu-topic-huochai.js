/**
 * 知识点「15 火柴棒游戏」：用火柴棒摆连排图形，找「第一个整着摆、后面每个靠着添」的规律。
 * 变式：①连排三角形（2n+1）②连排正方形（3n+1）③分开摆比连排多用几根（n−1，稍难默认关）。
 * 火柴列表由「顶点 + 线段」构造器生成，SVG 与答案同源：根数 = 线段数组长度，
 * 生成器里再用公式互验，两边对不上就丢弃——图和答案不可能脱节。
 */
(function (root) {
  'use strict'

  var U = root.SumSum.aoshu.util

  /* 各难度档的图形个数上限 */
  var N_MAX = { L1: 5, L2: 9, L3: 15 }

  function nMax(s) {
    return N_MAX[s.difficulty] || N_MAX.L1
  }

  /*
   * 连排三角形（之字形带）：顶点交替在下、上两排，边长 26px。
   * 之字边 n+1 根 + 上下横边 n 根 = 2n+1 根。
   */
  function triangleSticks(n) {
    var pts = []
    for (var i = 0; i <= n + 1; i++) {
      pts.push(i % 2 === 0 ? [(i / 2) * 26, 30] : [((i - 1) / 2) * 26 + 13, 4])
    }
    var sticks = []
    for (var j = 0; j + 1 < pts.length; j++) sticks.push([pts[j], pts[j + 1]])
    for (var k = 0; k + 2 < pts.length; k++) sticks.push([pts[k], pts[k + 2]])
    return sticks
  }

  /* 连排正方形：竖边 n+1 根 + 上下横边 2n 根 = 3n+1 根 */
  function squareSticks(n) {
    var s = 24
    var sticks = []
    for (var i = 0; i <= n; i++) sticks.push([[i * s, 4], [i * s, 4 + s]])
    for (var j = 0; j < n; j++) {
      sticks.push([[j * s, 4], [j * s + s, 4]])
      sticks.push([[j * s, 4 + s], [j * s + s, 4 + s]])
    }
    return sticks
  }

  /* 把火柴列表画成 SVG：每根两端各缩短 3px，圆头，看起来像一根根火柴 */
  function sticksSVG(sticks, ellipsis) {
    var maxX = 0
    var maxY = 0
    sticks.forEach(function (e) {
      maxX = Math.max(maxX, e[0][0], e[1][0])
      maxY = Math.max(maxY, e[0][1], e[1][1])
    })
    var lines = sticks
      .map(function (e) {
        var dx = e[1][0] - e[0][0]
        var dy = e[1][1] - e[0][1]
        var len = Math.sqrt(dx * dx + dy * dy)
        var ux = (dx / len) * 3
        var uy = (dy / len) * 3
        return (
          '<line x1="' + (e[0][0] + ux).toFixed(1) + '" y1="' + (e[0][1] + uy).toFixed(1) +
          '" x2="' + (e[1][0] - ux).toFixed(1) + '" y2="' + (e[1][1] - uy).toFixed(1) +
          '" stroke="#000" stroke-width="2.4" stroke-linecap="round" />'
        )
      })
      .join('')
    return (
      '<svg width="' + (maxX + 8) + '" height="' + (maxY + 8) +
      '" viewBox="-4 -2 ' + (maxX + 8) + ' ' + (maxY + 8) + '" style="vertical-align:middle">' +
      lines + '</svg>' +
      (ellipsis ? '<span style="font-size:15px;letter-spacing:2px">……</span>' : '')
    )
  }

  var SHAPES = {
    tri: { name: '三角形', per: 3, add: 2, build: triangleSticks },
    squ: { name: '正方形', per: 4, add: 3, build: squareSticks }
  }

  /* 「第一个 per 根 + 后面每个 add 根」的连加算式文案；项多时收成省略式 */
  function sumText(shape, n, s, answer) {
    var terms = [String(shape.per)]
    if (n - 1 <= 4) {
      for (var i = 1; i < n; i++) terms.push(String(shape.add))
      return terms.join(' + ') + ' = ' + answer + '（根）。'
    }
    var mul = s.difficulty === 'L1' ? '' : '（也就是 ' + shape.per + ' + ' + shape.add + '×' + (n - 1) + '）'
    return (
      shape.per + ' + ' + shape.add + ' + ' + shape.add + ' + ……后面每个都添 ' + shape.add +
      ' 根，一共添 ' + (n - 1) + ' 次' + mul + '，= ' + answer + '（根）。'
    )
  }

  /* 验一验换一条路：分开摆的总数 − 共用的根数，两条路殊途同归 */
  function checkText(shape, n, answer) {
    var apart = shape.per * n
    return (
      '换个算法查一查：分开摆每个要 ' + shape.per + ' 根，' + n + ' 个一共 ' + apart +
      ' 根；连排有 ' + (n - 1) + ' 处相邻、各共用 1 根，' + apart + ' − ' + (n - 1) +
      ' = ' + (apart - (n - 1)) + '（根），两种算法对上了 ✓'
    )
  }

  function genShape(s, shapeId) {
    var shape = SHAPES[shapeId]
    var n = U.randInt(2, nMax(s))
    var sticks = shape.build(n)
    var answer = sticks.length
    /* 构造器与公式互验：对不上说明构造器有错，宁可不出题 */
    if (answer !== shape.per + shape.add * (n - 1)) return null
    var drawn = shape.build(Math.min(n, 4))
    var stem =
      '用火柴棒摆 ' + n + ' 个连在一起的' + shape.name +
      '（相邻的两个共用一根火柴），一共要用几根火柴？'
    return {
      topic: 'huochai',
      variant: shapeId,
      stem: stem,
      stemHTML:
        stem + '<div style="margin-top:1.5mm">' + sticksSVG(drawn, n > 4) +
        (n > 4 ? '<span style="font-size:12px;color:#666">（图只画了前 4 个）</span>' : '') + '</div>',
      answer: answer,
      unit: '根',
      ansLabel: '答：一共要用',
      ansSuffix: '根火柴。',
      solution: [
        { tag: '想一想', text: '第一个' + shape.name + '要 ' + shape.per + ' 根；再摆下一个时它靠着前一个，共用了一根，只要添 ' + shape.add + ' 根。后面每一个都是这样。' },
        { tag: '列算式', text: sumText(shape, n, s, answer) },
        { tag: '验一验', text: checkText(shape, n, answer) },
        { tag: '答', text: '一共要用 ' + answer + ' 根火柴。' }
      ],
      key: shapeId + ':' + n
    }
  }

  function genTriangle(s) {
    return genShape(s, 'tri')
  }

  function genSquare(s) {
    return genShape(s, 'squ')
  }

  /* 变式③：分开摆比连排多用几根（= 相邻处数 n−1） */
  function genCompare(s) {
    var shapeId = U.pick(['tri', 'squ'])
    var shape = SHAPES[shapeId]
    var n = U.randInt(2, Math.min(nMax(s), 9))
    var chained = shape.build(n).length
    var apart = shape.per * n
    var answer = apart - chained
    if (answer !== n - 1) return null
    var stem =
      '用火柴棒摆 ' + n + ' 个' + shape.name + '：一个一个分开摆，比连排着摆（相邻共用一根）要多用几根火柴？'
    return {
      topic: 'huochai',
      variant: 'compare',
      stem: stem,
      stemHTML: stem + '<div style="margin-top:1.5mm">' + sticksSVG(shape.build(Math.min(n, 4)), n > 4) + '</div>',
      answer: answer,
      unit: '根',
      ansLabel: '答：分开摆要多用',
      ansSuffix: '根火柴。',
      solution: [
        { tag: '第 1 步', text: '分开摆：每个 ' + shape.per + ' 根，' + n + ' 个一共 ' + apart + ' 根。' },
        { tag: '第 2 步', text: '连排着摆：第一个 ' + shape.per + ' 根，后面每个添 ' + shape.add + ' 根，' + sumText(shape, n, s, chained) },
        { tag: '第 3 步', text: apart + ' − ' + chained + ' = ' + answer + '（根）。' },
        { tag: '验一验', text: '每两个相邻的' + shape.name + '共用 1 根，' + n + ' 个连成一排正好有 ' + (n - 1) + ' 处相邻——省下的就是这 ' + (n - 1) + ' 根 ✓' },
        { tag: '答', text: '分开摆要多用 ' + answer + ' 根火柴。' }
      ],
      key: 'cmp:' + shapeId + ':' + n
    }
  }

  var HUOCHAI = {
    id: 'huochai',
    no: '15',
    stage: 'L1',
    name: '火柴棒游戏',
    lesson: {
      title: '火柴棒游戏 · 方法讲解',
      sections: [
        {
          heading: '这是什么问题？',
          paras: ['用火柴棒摆一排图形，数一数一共用了几根。一根一根数很容易眼花，找到「搭一个新图形要添几根」的规律，又快又不会错。']
        },
        {
          heading: '怎么想？',
          paras: ['第一个三角形要 3 根。再摆第二个时，它靠着第一个、共用了一根，所以只要添 2 根；后面每一个都只添 2 根。正方形也一样：第一个 4 根，后面每个添 3 根。'],
          diagramHTML: '<div style="margin:1.5mm 0">' + sticksSVG(triangleSticks(3), false) + '<span style="font-size:12px;color:#666">　3 个连排三角形：3 + 2 + 2 = 7 根</span></div>'
        },
        {
          heading: '例题示范',
          example: {
            stem: '用火柴棒摆 4 个连在一起的三角形，一共要用几根火柴？',
            solution: [
              { tag: '想一想', text: '第一个三角形要 3 根，后面每个靠着前一个，只要添 2 根。' },
              { tag: '列算式', text: '3 + 2 + 2 + 2 = 9（根）。' },
              { tag: '验一验', text: '分开摆要 3 + 3 + 3 + 3 = 12 根；连排有 3 处相邻、各共用 1 根，12 − 3 = 9 根，对上了 ✓' },
              { tag: '答', text: '一共要用 9 根火柴。' }
            ]
          }
        },
        { heading: '记住口诀', chant: '头一个整个摆，后面靠着添；共用那一根，就是省下的。' }
      ]
    },
    variants: [
      { id: 'tri', setting: 'vHcTriangle', label: '连排三角形', gen: genTriangle },
      { id: 'squ', setting: 'vHcSquare', label: '连排正方形', gen: genSquare },
      { id: 'compare', setting: 'vHcCompare', label: '分开摆多用几根', def: false, gen: genCompare }
    ],
    generate: function (s) {
      return U.generateFrom(HUOCHAI.variants, s)
    },
    titleFor: function (s) {
      return '火柴棒游戏练习 · ' + U.DIFF_LABEL[s.difficulty]
    }
  }

  root.SumSum.aoshu.topics.huochai = HUOCHAI
  root.SumSum.aoshu.topicList.push(HUOCHAI)
})(typeof window !== 'undefined' ? window : globalThis)
