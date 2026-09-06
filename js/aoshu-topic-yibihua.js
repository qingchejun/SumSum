/**
 * 知识点「31 一笔作画问题」：笔不离纸、每条线只画一次——欧拉路问题。
 * 规则：连奇数条线的点叫「奇点」，奇点 0 个或 2 个才能一笔画成。
 *
 * 每个图形模板只有一份数据（顶点坐标 pts + 边表 edges）：
 * SVG、各点度数、示范画法（Hierholzer 算法找的欧拉路径）全部由它算出——图与答案同源。
 */
(function (root) {
  'use strict'

  var U = root.SumSum.aoshu.util

  var LETTERS = 'ABCDEFGHI'

  /* ---------- 图形模板库 ---------- */
  var TPLS = [
    {
      name: 'kou',
      label: '口字形',
      pts: [[14, 12], [66, 12], [66, 64], [14, 64]],
      edges: [[0, 1], [1, 2], [2, 3], [3, 0]]
    },
    {
      name: 'ri',
      label: '日字形',
      pts: [[18, 8], [62, 8], [18, 44], [62, 44], [18, 80], [62, 80]],
      edges: [[0, 1], [2, 3], [4, 5], [0, 2], [2, 4], [1, 3], [3, 5]]
    },
    {
      name: 'tian',
      label: '田字形',
      /* 3×3 个点，横竖各 6 段 */
      pts: [[12, 10], [44, 10], [76, 10], [12, 42], [44, 42], [76, 42], [12, 74], [44, 74], [76, 74]],
      edges: [
        [0, 1], [1, 2], [3, 4], [4, 5], [6, 7], [7, 8],
        [0, 3], [3, 6], [1, 4], [4, 7], [2, 5], [5, 8]
      ]
    },
    {
      name: 'mu',
      label: '目字形',
      pts: [[20, 6], [60, 6], [20, 32], [60, 32], [20, 58], [60, 58], [20, 84], [60, 84]],
      edges: [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [2, 4], [4, 6], [1, 3], [3, 5], [5, 7]]
    },
    {
      name: 'star',
      label: '五角星',
      pts: [[45, 6], [78, 30], [65, 70], [25, 70], [12, 30]],
      edges: [[0, 2], [2, 4], [4, 1], [1, 3], [3, 0]]
    },
    {
      name: 'xinfeng',
      label: '信封（不带盖）',
      /* 正方形 + 两条对角线（在中心交叉，中心是顶点） */
      pts: [[14, 14], [70, 14], [70, 70], [14, 70], [42, 42]],
      edges: [[0, 1], [1, 2], [2, 3], [3, 0], [0, 4], [4, 2], [1, 4], [4, 3]]
    },
    {
      name: 'xinfeng2',
      label: '信封（带盖）',
      pts: [[14, 34], [70, 34], [70, 84], [14, 84], [42, 59], [42, 8]],
      edges: [[0, 1], [1, 2], [2, 3], [3, 0], [0, 4], [4, 2], [1, 4], [4, 3], [0, 5], [5, 1]]
    },
    {
      name: 'fangzi',
      label: '小房子',
      pts: [[16, 36], [64, 36], [64, 80], [16, 80], [40, 8]],
      edges: [[0, 1], [1, 2], [2, 3], [3, 0], [0, 4], [4, 1]]
    },
    {
      name: 'hudie',
      label: '蝴蝶结',
      pts: [[10, 12], [10, 68], [40, 40], [70, 12], [70, 68]],
      edges: [[0, 2], [1, 2], [0, 1], [3, 2], [4, 2], [3, 4]]
    },
    {
      name: 'sanjiao',
      label: '带中线的三角形',
      pts: [[42, 8], [10, 72], [74, 72], [42, 72]],
      edges: [[0, 1], [0, 2], [1, 3], [3, 2], [0, 3]]
    }
  ]

  /* 各点度数 */
  function degrees(tpl) {
    var deg = tpl.pts.map(function () {
      return 0
    })
    tpl.edges.forEach(function (e) {
      deg[e[0]]++
      deg[e[1]]++
    })
    return deg
  }

  function oddPoints(tpl) {
    var odd = []
    degrees(tpl).forEach(function (d, i) {
      if (d % 2 === 1) odd.push(i)
    })
    return odd
  }

  /*
   * Hierholzer 算法找欧拉路径（奇点 0 或 2 个且连通时必成功）。
   * 返回顶点下标序列；找不到（奇点过多/不连通）返回 null。
   */
  function eulerPath(tpl) {
    var odd = oddPoints(tpl)
    if (odd.length !== 0 && odd.length !== 2) return null
    var adj = tpl.pts.map(function () {
      return []
    })
    tpl.edges.forEach(function (e, idx) {
      adj[e[0]].push({ to: e[1], id: idx })
      adj[e[1]].push({ to: e[0], id: idx })
    })
    var used = {}
    var ptr = tpl.pts.map(function () {
      return 0
    })
    var stack = [odd.length ? odd[0] : tpl.edges[0][0]]
    var path = []
    while (stack.length) {
      var v = stack[stack.length - 1]
      var next = null
      while (ptr[v] < adj[v].length) {
        var e = adj[v][ptr[v]]
        ptr[v]++
        if (!used[e.id]) {
          used[e.id] = true
          next = e
          break
        }
      }
      if (next) stack.push(next.to)
      else path.push(stack.pop())
    }
    path.reverse()
    return path.length === tpl.edges.length + 1 ? path : null
  }

  /* ---------- SVG（线段 + 顶点圆点 + 字母标注） ---------- */
  function tplSVG(tpl) {
    var minX = Infinity
    var minY = Infinity
    var maxX = -Infinity
    var maxY = -Infinity
    tpl.pts.forEach(function (p) {
      minX = Math.min(minX, p[0])
      minY = Math.min(minY, p[1])
      maxX = Math.max(maxX, p[0])
      maxY = Math.max(maxY, p[1])
    })
    var cx = (minX + maxX) / 2
    var cy = (minY + maxY) / 2
    var lines = tpl.edges
      .map(function (e) {
        return (
          '<line x1="' + tpl.pts[e[0]][0] + '" y1="' + tpl.pts[e[0]][1] +
          '" x2="' + tpl.pts[e[1]][0] + '" y2="' + tpl.pts[e[1]][1] +
          '" stroke="#000" stroke-width="1.8" />'
        )
      })
      .join('')
    var dots = tpl.pts
      .map(function (p, i) {
        /* 字母放在「远离图形中心」的一侧，避免压线 */
        var lx = p[0] + (p[0] > cx ? 6 : p[0] < cx ? -14 : -4)
        var ly = p[1] + (p[1] > cy ? 13 : p[1] < cy ? -5 : 4)
        return (
          '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="2.6" fill="#000" />' +
          '<text x="' + lx + '" y="' + ly + '" font-size="11" fill="#000">' + LETTERS[i] + '</text>'
        )
      })
      .join('')
    var pad = 18
    return (
      '<svg width="' + (maxX - minX + pad * 2) + '" height="' + (maxY - minY + pad * 2) +
      '" viewBox="' + (minX - pad) + ' ' + (minY - pad) + ' ' + (maxX - minX + pad * 2) + ' ' + (maxY - minY + pad * 2) +
      '" style="vertical-align:middle">' + lines + dots + '</svg>'
    )
  }

  /* 度数清单文案：「A 连 2 条、B 连 3 条……」 */
  function degreeText(tpl) {
    return degrees(tpl)
      .map(function (d, i) {
        return LETTERS[i] + ' 连 ' + d + ' 条'
      })
      .join('、')
  }

  function letterList(idxs) {
    return idxs
      .map(function (i) {
        return LETTERS[i]
      })
      .join('、')
  }

  function pathText(path) {
    return path
      .map(function (i) {
        return LETTERS[i]
      })
      .join('→')
  }

  /* 变式①：能不能一笔画成 */
  function genCan(s) {
    var canPool = TPLS.filter(function (t) {
      return oddPoints(t).length <= 2
    })
    var noPool = TPLS.filter(function (t) {
      return oddPoints(t).length > 2
    })
    var can = Math.random() < 0.5
    var tpl = U.pick(can ? canPool : noPool)
    var odd = oddPoints(tpl)
    var oddDesc = odd.length === 0 ? '一个奇点也没有' : '奇点有 ' + odd.length + ' 个：' + letterList(odd)
    var check
    if (can) {
      var path = eulerPath(tpl)
      if (!path) return null // 防御：理论上不会发生
      check = '真的可以这样画（每条线正好一次）：' + pathText(path) + ' ✓'
    } else {
      check =
        '起笔占一个奇点、收笔占一个奇点，最多只能「照顾」2 个奇点；这里有 ' + odd.length +
        ' 个（' + letterList(odd) + '），多出来的走不通，所以画不成。'
    }
    var stem = '下面的' + tpl.label + '，笔不离开纸、每条线都要画到且只画一次，能一笔画成吗？'
    return {
      topic: 'yibihua',
      workLabel: '数一数',
      variant: 'can',
      stem: stem,
      stemHTML: stem + '<div style="margin-top:1mm">' + tplSVG(tpl) + '</div>',
      answer: can ? '能' : '不能',
      unit: '',
      ansLabel: '答：这个图形',
      ansSuffix: '一笔画成。',
      solution: [
        { tag: '想一想', text: '数一数每个点连出几条线。连奇数条线的点叫「奇点」——奇点 0 个或 2 个才能一笔画成。' },
        { tag: '数一数', text: degreeText(tpl) + '。' + oddDesc + '。' },
        { tag: '验一验', text: check },
        { tag: '答', text: '这个图形' + (can ? '能' : '不能') + '一笔画成。' }
      ],
      key: 'can:' + tpl.name
    }
  }

  /* 变式②：从哪个点开始画（只用恰有 2 个奇点的模板） */
  function genStart(s) {
    var pool = TPLS.filter(function (t) {
      return oddPoints(t).length === 2
    })
    var tpl = U.pick(pool)
    var odd = oddPoints(tpl)
    var path = eulerPath(tpl)
    if (!path) return null
    var ansText = LETTERS[odd[0]] + ' 或 ' + LETTERS[odd[1]]
    var stem = '下面的' + tpl.label + '能一笔画成。应该从哪个点开始画？（写出字母）'
    return {
      topic: 'yibihua',
      workLabel: '数一数',
      variant: 'start',
      stem: stem,
      stemHTML: stem + '<div style="margin-top:1mm">' + tplSVG(tpl) + '</div>',
      answer: ansText,
      unit: '',
      ansLabel: '答：应该从',
      ansSuffix: '点开始画。',
      solution: [
        { tag: '想一想', text: '有 2 个奇点的图形，必须从一个奇点下笔，最后停在另一个奇点——从别的点开始一定会卡住。' },
        { tag: '数一数', text: degreeText(tpl) + '。奇点是 ' + letterList(odd) + '。' },
        { tag: '验一验', text: '从 ' + LETTERS[path[0]] + ' 出发真的能画完：' + pathText(path) + '，正好停在 ' + LETTERS[path[path.length - 1]] + ' ✓' },
        { tag: '答', text: '应该从 ' + ansText + ' 点开始画（一个当起点，另一个当终点）。' }
      ],
      key: 'start:' + tpl.name
    }
  }

  var YIBIHUA = {
    id: 'yibihua',
    no: '31',
    stage: 'L2',
    name: '一笔作画问题',
    lesson: {
      title: '一笔作画 · 方法讲解',
      sections: [
        {
          heading: '这是什么问题？',
          paras: ['笔不离开纸、每条线只画一次，把整个图形画出来——这就是「一笔画」。有的图能，有的图怎么画都差一条，秘密藏在「点」上。']
        },
        {
          heading: '怎么想？',
          paras: [
            '数一数每个点连出几条线：连奇数条线的点叫「奇点」。',
            '一个奇点也没有：从任何点出发都能画成，最后回到起点；正好 2 个奇点：能画成，但必须从一个奇点出发、停在另一个奇点；奇点超过 2 个：怎么画都画不成。'
          ],
          diagramHTML: '<div style="margin:1.5mm 0">' + tplSVG(TPLS[1]) + '<span style="font-size:12px;color:#666">　日字形：C 和 D 各连 3 条线，是仅有的 2 个奇点</span></div>'
        },
        {
          heading: '例题示范',
          example: {
            stem: '「日」字形能一笔画成吗？如果能，从哪里开始画？',
            solution: [
              { tag: '数一数', text: 'A 连 2 条、B 连 2 条、C 连 3 条、D 连 3 条、E 连 2 条、F 连 2 条——奇点是 C 和 D，正好 2 个。' },
              { tag: '判一判', text: '奇点正好 2 个，能一笔画成，但要从 C 或 D 下笔。' },
              { tag: '验一验', text: '从 C 出发：C→A→B→D→C→E→F→D，7 条线一条不落，停在 D ✓' },
              { tag: '答', text: '能一笔画成，从 C 或 D 开始画。' }
            ]
          }
        },
        { heading: '记住口诀', chant: '每点数线条，单数叫奇点；奇点零或二，一笔画得成。' }
      ]
    },
    variants: [
      { id: 'can', setting: 'vYbCan', label: '能不能一笔画成', gen: genCan },
      { id: 'start', setting: 'vYbStart', label: '从哪个点开始画', gen: genStart }
    ],
    generate: function (s) {
      return U.generateFrom(YIBIHUA.variants, s)
    },
    titleFor: function (s) {
      return '一笔作画练习 · ' + U.DIFF_LABEL[s.difficulty]
    }
  }

  root.SumSum.aoshu.topics.yibihua = YIBIHUA
  root.SumSum.aoshu.topicList.push(YIBIHUA)
})(typeof window !== 'undefined' ? window : globalThis)
