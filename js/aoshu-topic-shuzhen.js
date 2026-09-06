/**
 * 知识点「35 数阵图初步」：把一组数填进图形，让每条线上的数之和都相等。
 * 变式：①十字数阵（五个数、横竖两条线）②三角数阵（六个数、三条边，稍难默认关）。
 *
 * 生成方式：枚举全部合法布局 → 随机取一个 → 遮住两个格（? 和 □）→
 * 再枚举「剩下两个数填进两个空」的所有填法，验证恰好一种成立（唯一解硬约束）。
 * 遮法保证 ? 与 □ 各自所在的线只缺自己一个数，孩子一步就能求出。
 */
(function (root) {
  'use strict'

  var U = root.SumSum.aoshu.util

  /* 全排列（数组较短，直接递归） */
  function permutations(arr) {
    if (arr.length <= 1) return [arr]
    var res = []
    arr.forEach(function (x, i) {
      var rest = arr.slice(0, i).concat(arr.slice(i + 1))
      permutations(rest).forEach(function (p) {
        res.push([x].concat(p))
      })
    })
    return res
  }

  /* ---------- 变式①：十字数阵 ---------- */

  /* 十字五格：上 T、左 L、中 C、右 R、下 B；横线 L+C+R、竖线 T+C+B */
  function crossLayouts(base) {
    var nums = [base, base + 1, base + 2, base + 3, base + 4]
    return permutations(nums)
      .filter(function (p) {
        return p[0] + p[2] + p[4] === p[1] + p[2] + p[3]
      })
      .map(function (p) {
        return { T: p[0], L: p[1], C: p[2], R: p[3], B: p[4], S: p[1] + p[2] + p[3] }
      })
  }

  /* 圆圈格子；hidden 的格子只占位不显示（用来对齐十字的上下行） */
  function circleCell(txt, hidden) {
    return (
      '<span style="display:inline-block;width:5.5mm;height:5.5mm;line-height:5.1mm;' +
      'border:1.5px solid #000;border-radius:50%;text-align:center;font-size:14px;margin:0.4mm;' +
      (hidden ? 'visibility:hidden;' : '') + '">' + txt + '</span>'
    )
  }

  function crossHTML(show) {
    return (
      '<div style="margin-top:1mm;line-height:1">' +
      '<div>' + circleCell('0', true) + circleCell(show.T) + '</div>' +
      '<div>' + circleCell(show.L) + circleCell(show.C) + circleCell(show.R) + '</div>' +
      '<div>' + circleCell('0', true) + circleCell(show.B) + '</div>' +
      '</div>'
    )
  }

  var CROSS_BASE = { L1: [1], L2: [1, 2], L3: [1, 2, 3] }

  function genCross(s) {
    var base = U.pick(CROSS_BASE[s.difficulty] || CROSS_BASE.L1)
    var layout = U.pick(crossLayouts(base))
    var rowHidden = U.pick(['L', 'R'])
    var colHidden = U.pick(['T', 'B'])
    var qCell = U.pick([rowHidden, colHidden])
    var boxCell = qCell === rowHidden ? colHidden : rowHidden
    var S = layout.S

    /* 唯一解验证：剩下两个数填进两个空，只能有一种填法 */
    var v1 = layout[rowHidden]
    var v2 = layout[colHidden]
    var count = 0
    ;[[v1, v2], [v2, v1]].forEach(function (assign) {
      var t = { T: layout.T, L: layout.L, C: layout.C, R: layout.R, B: layout.B }
      t[rowHidden] = assign[0]
      t[colHidden] = assign[1]
      if (t.L + t.C + t.R === S && t.T + t.C + t.B === S) count++
    })
    if (count !== 1) return null

    var show = {}
    ;['T', 'L', 'C', 'R', 'B'].forEach(function (k) {
      show[k] = k === qCell ? '？' : k === boxCell ? '□' : String(layout[k])
    })
    var qOnRow = qCell === 'L' || qCell === 'R'
    var known1 = layout.C
    var known2 = qOnRow ? layout[qCell === 'L' ? 'R' : 'L'] : layout[qCell === 'T' ? 'B' : 'T']
    var boxKnown = qOnRow ? layout[boxCell === 'T' ? 'B' : 'T'] : layout[boxCell === 'L' ? 'R' : 'L']
    var answer = layout[qCell]
    var boxVal = layout[boxCell]
    var stem =
      '把 ' + base + '～' + (base + 4) + ' 填进十字形（每个数只用一次），横行、竖行的和都要等于 ' + S + '。？处填几？'
    return {
      topic: 'shuzhen',
      workLabel: '算一算',
      variant: 'cross',
      stem: stem,
      stemHTML: stem + crossHTML(show),
      answer: answer,
      unit: '',
      ansLabel: '答：？处应该填',
      ansSuffix: '。',
      solution: [
        { tag: '想一想', text: '先找「只缺一个数」的线——？所在的' + (qOnRow ? '横行' : '竖行') + '另外两个圈都已知，正好从它下手。' },
        { tag: '第 1 步', text: (qOnRow ? '横行' : '竖行') + '：' + S + ' − ' + known1 + ' − ' + known2 + ' = ' + answer + '，所以 ？ = ' + answer + '。' },
        { tag: '第 2 步', text: '□ 用它那条线算：' + S + ' − ' + known1 + ' − ' + boxKnown + ' = ' + boxVal + '（也正好是五个数里最后剩下的那个）。' },
        { tag: '验一验', text: '横行 ' + layout.L + ' + ' + layout.C + ' + ' + layout.R + ' = ' + S + ' ✓，竖行 ' + layout.T + ' + ' + layout.C + ' + ' + layout.B + ' = ' + S + ' ✓，' + base + '～' + (base + 4) + ' 每个数正好用一次 ✓' },
        { tag: '答', text: '？处应该填 ' + answer + '。' }
      ],
      key: 'cross:' + base + ':' + [layout.T, layout.L, layout.C, layout.R, layout.B].join(',') + ':' + qCell + boxCell
    }
  }

  /* ---------- 变式②：三角数阵（1~6 填三条边，每边三数之和相等） ---------- */

  /* 格子顺序：V1 V2 V3 三个顶点，M1(V1V2 边中) M2(V2V3) M3(V3V1) */
  var TRI_SIDES = [
    [0, 3, 1],
    [1, 4, 2],
    [2, 5, 0]
  ]

  function triLayouts() {
    return permutations([1, 2, 3, 4, 5, 6])
      .filter(function (p) {
        var s0 = p[0] + p[3] + p[1]
        return s0 === p[1] + p[4] + p[2] && s0 === p[2] + p[5] + p[0]
      })
      .map(function (p) {
        return { cells: p, S: p[0] + p[3] + p[1] }
      })
  }

  var TRI_LAYOUTS = null // 惰性生成一次即可（720 排列）

  var TRI_PTS = [[45, 14], [12, 82], [78, 82], [28.5, 48], [45, 82], [61.5, 48]]

  function triHTML(showTexts) {
    var lines = [[0, 1], [1, 2], [2, 0]]
      .map(function (e) {
        return (
          '<line x1="' + TRI_PTS[e[0]][0] + '" y1="' + TRI_PTS[e[0]][1] +
          '" x2="' + TRI_PTS[e[1]][0] + '" y2="' + TRI_PTS[e[1]][1] + '" stroke="#000" stroke-width="1.5" />'
        )
      })
      .join('')
    var circles = TRI_PTS.map(function (p, i) {
      return (
        '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="9" fill="#fff" stroke="#000" stroke-width="1.5" />' +
        '<text x="' + p[0] + '" y="' + (p[1] + 4) + '" font-size="12" text-anchor="middle" fill="#000">' + showTexts[i] + '</text>'
      )
    }).join('')
    return (
      '<div style="margin-top:1.5mm"><svg width="100" height="104" viewBox="-5 0 100 104" style="vertical-align:middle">' +
      lines + circles + '</svg></div>'
    )
  }

  function genTri(s) {
    if (!TRI_LAYOUTS) TRI_LAYOUTS = triLayouts()
    var layout = U.pick(TRI_LAYOUTS)
    var cells = layout.cells
    var S = layout.S
    /* 遮一个边中点 + 不在那条边上的顶点：两者都能靠自己的线一步求出 */
    var mi = U.randInt(3, 5)
    var vi = [2, 0, 1][mi - 3]
    var qIdx = U.pick([mi, vi])
    var boxIdx = qIdx === mi ? vi : mi

    /* 唯一解验证：剩下两个数填两个空，只能有一种填法 */
    var count = 0
    ;[[cells[mi], cells[vi]], [cells[vi], cells[mi]]].forEach(function (assign) {
      var t = cells.slice()
      t[mi] = assign[0]
      t[vi] = assign[1]
      var ok = TRI_SIDES.every(function (side) {
        return t[side[0]] + t[side[1]] + t[side[2]] === S
      })
      if (ok) count++
    })
    if (count !== 1) return null

    var show = cells.map(function (v, i) {
      return i === qIdx ? '？' : i === boxIdx ? '□' : String(v)
    })
    /* ？所在的、且不含 □ 的那条线（构造保证存在且只缺 ？ 一个数） */
    var qSide = TRI_SIDES.filter(function (side) {
      return side.indexOf(qIdx) >= 0 && side.indexOf(boxIdx) < 0
    })[0]
    var knowns = qSide.filter(function (i) {
      return i !== qIdx
    })
    var answer = cells[qIdx]
    var stem =
      '把 1～6 这六个数填进三角形边上的六个圈里（每个数只用一次），已经填好了四个。' +
      '要让每条边上三个数的和都等于 ' + S + '，？处应该填几？'
    return {
      topic: 'shuzhen',
      workLabel: '算一算',
      variant: 'tri',
      stem: stem,
      stemHTML: stem + triHTML(show),
      answer: answer,
      unit: '',
      ansLabel: '答：？处应该填',
      ansSuffix: '。',
      solution: [
        { tag: '想一想', text: '三条边里找「只缺 ？ 一个数」的那条——它的另外两个圈都已知。' },
        { tag: '第 1 步', text: '这条边：' + S + ' − ' + cells[knowns[0]] + ' − ' + cells[knowns[1]] + ' = ' + answer + '，所以 ？ = ' + answer + '。' },
        { tag: '第 2 步', text: '□ 填最后剩下的数 ' + cells[boxIdx] + '（用它所在的边算也一样）。' },
        {
          tag: '验一验',
          text: TRI_SIDES.map(function (side) {
            return cells[side[0]] + ' + ' + cells[side[1]] + ' + ' + cells[side[2]] + ' = ' + S
          }).join('，') + '，三条边都相等 ✓'
        },
        { tag: '答', text: '？处应该填 ' + answer + '。' }
      ],
      key: 'tri:' + cells.join(',') + ':' + qIdx + ',' + boxIdx
    }
  }

  var SHUZHEN = {
    id: 'shuzhen',
    no: '35',
    stage: 'L2',
    name: '数阵图初步',
    lesson: {
      title: '数阵图 · 方法讲解',
      sections: [
        {
          heading: '这是什么问题？',
          paras: ['把一组数填进图形的圈圈里，让每条线上的数加起来都相等——这样的图叫「数阵图」。看起来要靠猜，其实有窍门。']
        },
        {
          heading: '怎么想？',
          paras: ['窍门只有一句话：先找「只缺一个数」的那条线。用这条线的和减去已知的两个数，空里的数就出来了；填完一个，下一条线又变成只缺一个，一条一条全解开。'],
          diagramHTML: crossHTML({ T: '3', L: '2', C: '1', R: '5', B: '4' }) + '<div style="font-size:12px;color:#666">填好的十字数阵：横行 2+1+5=8，竖行 3+1+4=8</div>'
        },
        {
          heading: '例题示范',
          example: {
            stem: '把 1～5 填进十字形（已填好 1、5、4 三个数），使横行、竖行的和都等于 8。？（上格）应该填几？□ 是左格。',
            solution: [
              { tag: '想一想', text: '？所在的竖行里，中间 1、下面 4 都已知——只缺 ？ 一个数，从它下手。' },
              { tag: '第 1 步', text: '竖行：8 − 1 − 4 = 3，所以 ？ = 3。' },
              { tag: '第 2 步', text: '□ 用横行算：8 − 1 − 5 = 2（也正好是 1～5 里最后剩下的数）。' },
              { tag: '验一验', text: '横行 2 + 1 + 5 = 8 ✓，竖行 3 + 1 + 4 = 8 ✓' },
              { tag: '答', text: '？处应该填 3。' }
            ]
          }
        },
        { heading: '记住口诀', chant: '缺一个的线先下手，和减已知就到手。' }
      ]
    },
    variants: [
      { id: 'cross', setting: 'vZhenCross', label: '十字数阵', gen: genCross },
      { id: 'tri', setting: 'vZhenTri', label: '三角数阵', def: false, gen: genTri }
    ],
    generate: function (s) {
      return U.generateFrom(SHUZHEN.variants, s)
    },
    titleFor: function (s) {
      return '数阵图练习 · ' + U.DIFF_LABEL[s.difficulty]
    }
  }

  root.SumSum.aoshu.topics.shuzhen = SHUZHEN
  root.SumSum.aoshu.topicList.push(SHUZHEN)
})(typeof window !== 'undefined' ? window : globalThis)
