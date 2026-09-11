/**
 * 奥数练习纸渲染与分页。
 *
 * 与口算 render.js 同一思路：JS 显式分页，每页自带页眉页脚，题目绝不跨页截断。
 * 纸张骨架（.sheet / .sheet-head / .sheet-foot）与口算共用类名和 CSS，
 * 页眉「日期 姓名 用时 得分」等零件取自 SumSum.render.parts。
 * 奥数页固定 A4 纵向，单列布局；每页块数不固定：先用隐藏探针实测每块
 * 内容高度，加演算留白后贪心装页——短题多排、带图的长题少排，互不挤压。
 */
(function (root) {
  'use strict'

  /* 动态分页参数（mm）。capacity 与 css/aoshu.css 打印段的 min-height 硬对应 */
  var MM = {
    capacity: 225, // 每页内容区高度
    workPad: 10, // 每题在内容之外追加的演算留白
    minQ: 25, // 题块最小高度：再短的题也留得下一行竖式
    maxQ: 62, // 摊分页面剩余空间时单题的高度上限，防止两题撑满整页
    solPad: 3 // 解析块下方的呼吸空间
  }

  function P() {
    return root.SumSum.render.parts
  }

  /* 题干 HTML：默认转义纯文本；图形类知识点可提供 stemHTML（生成器自产的可信 HTML） */
  function stemHTML(q) {
    return q.stemHTML || P().esc(q.stem)
  }

  /*
   * 内联高度：装页后块高由 JS 定死（mm），演算留白 flex 吃掉题干外的剩余空间。
   * 向下取到 0.1mm——四舍五入时每块最多多出 0.05mm，一页七八块累计起来
   * 会超出内容区，把页脚顶下去甚至多挤出一张空白页。
   */
  function heightStyle(mm) {
    return mm ? ' style="height:' + (Math.floor(mm * 10) / 10).toFixed(1) + 'mm"' : ''
  }

  /* 题目块：题号 + 题干 + 演算留白 + 底部答句挖空行 */
  function questionBlockHTML(q, idx, mm) {
    var p = P()
    return (
      '<div class="aq"' + heightStyle(mm) + '>' +
      '<div class="aq-stem"><span class="aq-num">' + p.numLabel(idx) + '</span>' +
      stemHTML(q) + '</div>' +
      '<div class="aq-work"></div>' +
      '<div class="aq-ans">' + (q.workLabel || '列式') + '：<span class="blank blank-expr"></span>　' +
      p.esc(q.ansLabel) + ' <span class="blank"></span> ' + p.esc(q.ansSuffix) +
      '</div>' +
      '</div>'
    )
  }

  /*
   * 通用圆点图：{ rows: [{label, groups: [{type:'solid'|'hollow', n}]}], note }
   * 实心 ●、空心 ○，各知识点自行决定圆点的含义并写进 note。
   */
  function diagramHTML(d) {
    var p = P()
    var rows = d.rows
      .map(function (row) {
        var dots = row.groups
          .map(function (g) {
            if (!g.n) return ''
            return '<span class="dots">' + (g.type === 'solid' ? '●' : '○').repeat(g.n) + '</span>'
          })
          .join('')
        return (
          '<div class="dot-row"><span class="dot-label">' + p.esc(row.label) + '</span>' +
          dots + '</div>'
        )
      })
      .join('')
    return (
      '<div class="sol-diagram">' + rows +
      '<div class="dot-note">' + p.esc(d.note) + '</div>' +
      '</div>'
    )
  }

  /* 步骤列表（讲解页例题与解析块共用），返回 <ul> + 答句 */
  function stepsHTML(solution) {
    var p = P()
    var steps = solution
      .filter(function (st) {
        return st.tag !== '答'
      })
      .map(function (st) {
        return (
          '<li><span class="step-tag">' + p.esc(st.tag) + '</span>　' +
          p.esc(st.text) + '</li>'
        )
      })
      .join('')
    var answer = solution.filter(function (st) {
      return st.tag === '答'
    })[0]
    return (
      '<ul class="sol-steps">' + steps + '</ul>' +
      (answer ? '<div class="sol-answer">答：' + p.esc(answer.text) + '</div>' : '')
    )
  }

  /* 知识点讲解页：概念 → 思路（配图）→ 例题示范 → 口诀，内容来自 topic.lesson */
  function lessonBodyHTML(lesson) {
    var p = P()
    return lesson.sections
      .map(function (sec) {
        var body = ''
        if (sec.paras) {
          body += sec.paras
            .map(function (t) {
              return '<p class="lesson-p">' + p.esc(t) + '</p>'
            })
            .join('')
        }
        if (sec.diagramHTML) body += sec.diagramHTML
        if (sec.diagram) body += diagramHTML(sec.diagram)
        if (sec.example) {
          body +=
            '<div class="lesson-example">' +
            '<div class="lesson-stem">' + (sec.example.stemHTML || p.esc(sec.example.stem)) + '</div>' +
            stepsHTML(sec.example.solution) +
            '</div>'
        }
        if (sec.chant) body += '<div class="lesson-chant">' + p.esc(sec.chant) + '</div>'
        return (
          '<section class="lesson-sec">' +
          '<h3 class="lesson-h">' + p.esc(sec.heading) + '</h3>' +
          body +
          '</section>'
        )
      })
      .join('')
  }

  /* 解析块：题干重印（小号灰字）+ 圆点图示（若有）+ 分步骤讲解 + 加粗答句 */
  function solutionBlockHTML(q, idx, mm) {
    var p = P()
    return (
      '<div class="sol"' + heightStyle(mm) + '>' +
      '<div class="sol-stem"><span class="aq-num">' + p.numLabel(idx) + '</span>' +
      stemHTML(q) + '</div>' +
      (q.diagramHTML ? q.diagramHTML : q.diagram ? diagramHTML(q.diagram) : '') +
      stepsHTML(q.solution) +
      '</div>'
    )
  }

  function pageHTML(opts) {
    var p = P()
    return (
      '<section class="sheet">' +
      '<header class="sheet-head">' +
      '<h2 class="sheet-title">' + p.esc(opts.title) + '</h2>' +
      p.metaHTML() +
      '</header>' +
      '<div class="' + opts.gridClass + '">' + opts.blocksHTML + '</div>' +
      '<footer class="sheet-foot">' +
      opts.footPrefix + '第 ' + opts.pageNo + ' 页 / 共 ' + opts.pageTotal + ' 页' +
      '</footer>' +
      '</section>'
    )
  }

  /*
   * 探针测高：把所有块放进一张隐藏的 .sheet 里，按纸张真实宽度排版后
   * 量出每块自然高度。同一探针里放一个 100mm 标尺换算 px → mm，
   * 这样屏幕缩放（zoom）等因素会在换算里自行抵消。
   */
  function measureMM(container, gridClass, blocksHTML) {
    var probe = root.document.createElement('section')
    probe.className = 'sheet'
    probe.style.position = 'absolute'
    probe.style.visibility = 'hidden'
    probe.style.left = '-9999px'
    probe.innerHTML =
      '<div class="' + gridClass + '">' + blocksHTML + '</div>' +
      '<div style="height:100mm"></div>'
    container.appendChild(probe)
    var pxPerMm = probe.lastElementChild.offsetHeight / 100
    var heights = Array.prototype.map.call(
      probe.querySelectorAll('.aq, .sol'),
      function (b) {
        return b.offsetHeight / pxPerMm
      }
    )
    container.removeChild(probe)
    return heights
  }

  /*
   * 装页：每块高度 = 自然高度 + 留白（不低于 minH），贪心装满 capacity 换页；
   * stretch 时把页内剩余高度平摊给各块（单块不超过 maxH），让整页舒展。
   * 返回 [{ idx: [题目下标], slots: [块高 mm] }]。
   */
  function slotFor(h, opts) {
    return Math.min(MM.capacity, Math.max(opts.minH || 0, h + opts.pad))
  }

  /*
   * 把 n 道题尽量平均地摊到 k 页：前 n%k 页各多一道
   * （10 题 3 页 → 4+3+3，而不是 4+4+2）。任一页装不下就返回 null。
   */
  function tryEven(heights, k, opts) {
    var n = heights.length
    var base = Math.floor(n / k)
    var extra = n % k
    var pages = []
    var at = 0
    for (var p = 0; p < k; p++) {
      var take = base + (p < extra ? 1 : 0)
      var pg = { idx: [], slots: [], total: 0 }
      for (var j = 0; j < take; j++) {
        var slot = slotFor(heights[at], opts)
        pg.idx.push(at)
        pg.slots.push(slot)
        pg.total += slot
        at++
      }
      if (pg.total > MM.capacity + 0.1) return null
      pages.push(pg)
    }
    return pages
  }

  function packPages(heights, opts) {
    var pages = []
    var cur = null
    heights.forEach(function (h, i) {
      var slot = slotFor(h, opts)
      if (!cur || cur.total + slot > MM.capacity + 0.1) {
        cur = { idx: [], slots: [], total: 0 }
        pages.push(cur)
      }
      cur.idx.push(i)
      cur.slots.push(slot)
      cur.total += slot
    })
    /*
     * 贪心只保证页数最少，末页常常只剩一两道题（6 题会排成 5 + 1，
     * 第二页七成空白）。页数不变的前提下按题数均分一次，均不匀就作罢。
     */
    if (pages.length > 1) {
      var even = tryEven(heights, pages.length, opts)
      if (even) pages = even
    }
    if (opts.stretch) {
      pages.forEach(function (pg) {
        var share = (MM.capacity - pg.total) / pg.slots.length
        pg.slots = pg.slots.map(function (s) {
          return Math.min(opts.maxH, s + share)
        })
      })
    }
    return pages
  }

  /*
   * 内容超高兜底（仿口算 fitSheet）：块内容比格子高时逐 px 缩字号（下限 11px）。
   * 解析步骤由模板生成、行数上限可控，正常不会触发，只作 L3 长数字等极端情况的双保险。
   */
  function fitBlocks(container) {
    var blocks = container.querySelectorAll('.aq, .sol')
    Array.prototype.forEach.call(blocks, function (block) {
      var size = parseFloat(root.getComputedStyle(block).fontSize)
      while (block.scrollHeight > block.clientHeight + 1 && size > 11) {
        size -= 1
        block.style.fontSize = size + 'px'
      }
    })
  }

  /* 一批页面（题目页或解析页）的 HTML 数组：先测高装页，再带内联高度重排 */
  function sheetsHTML(container, questions, opts) {
    var probeHTML = questions
      .map(function (q, i) {
        return opts.blockHTML(q, i + 1)
      })
      .join('')
    var heights = measureMM(container, opts.gridClass, probeHTML)
    var pages = packPages(heights, opts)
    return pages.map(function (pg, p) {
      var blocks = pg.idx
        .map(function (qi, j) {
          return opts.blockHTML(questions[qi], qi + 1, pg.slots[j])
        })
        .join('')
      return pageHTML({
        title: opts.title,
        blocksHTML: blocks,
        gridClass: opts.gridClass,
        pageNo: p + 1,
        pageTotal: pages.length,
        footPrefix: opts.footPrefix
      })
    })
  }

  /* 主入口：（可选）讲解页 + 题目页 + （可选）解析页 */
  function render(container, s, questions) {
    var topic = root.SumSum.aoshu.topics[s.topic]
    var title = s.title || topic.titleFor(s)
    var html = []

    if (s.lessonPage && topic.lesson) {
      html.push(
        pageHTML({
          title: topic.lesson.title,
          blocksHTML: lessonBodyHTML(topic.lesson),
          gridClass: 'lesson-flow',
          pageNo: 1,
          pageTotal: 1,
          footPrefix: '讲解 · '
        })
      )
    }

    html = html.concat(
      sheetsHTML(container, questions, {
        title: title,
        gridClass: 'aoshu-grid',
        blockHTML: questionBlockHTML,
        pad: MM.workPad,
        minH: MM.minQ,
        maxH: MM.maxQ,
        stretch: true,
        footPrefix: ''
      })
    )

    if (s.answerPage) {
      html = html.concat(
        sheetsHTML(container, questions, {
          title: title + '（解析）',
          gridClass: 'sol-grid',
          blockHTML: solutionBlockHTML,
          pad: MM.solPad,
          footPrefix: '解析 · '
        })
      )
    }

    container.innerHTML = html.join('')
    fitBlocks(container)
  }

  root.SumSum = root.SumSum || {}
  root.SumSum.aoshu = root.SumSum.aoshu || {}
  root.SumSum.aoshu.render = { render: render }
})(typeof window !== 'undefined' ? window : globalThis)
