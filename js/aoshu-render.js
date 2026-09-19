/**
 * 奥数练习纸渲染与分页。
 *
 * 与口算 render.js 同一思路：JS 显式分页，每页自带页眉页脚，题目绝不跨页截断。
 * 纸张骨架（.sheet / .sheet-head / .sheet-foot）与口算共用类名和 CSS，
 * 页眉「日期 姓名 用时 得分」等零件取自 SumSum.render.parts。
 * 奥数页固定 A4 纵向，单列布局；每页块数不固定：先用隐藏探针实测每块
 * 内容高度，按最小留白贪心装页——短题多排、带图的长题少排，互不挤压；
 * 题量少、一页排得开时再把余量摊回各题，排松一点。
 */
(function (root) {
  'use strict'

  /* 动态分页参数（mm）。capacity 与 css/aoshu.css 打印段的 min-height 硬对应 */
  var MM = {
    capacity: 225, // 每页内容区高度
    workMin: 3, // 装页时每题至少留的演算空隙：决定一页最多塞几道题
    workMax: 14, // 演算留白上限：摊分页面余量时，这道缝隙最多撑到这么宽
    tailMax: 14, // 答题线以下的收尾留白上限：余量超出演算上限的部分落在这里
    minQ: 18, // 题块最小高度：再短的题也留得下写一行的地方
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
   * 内联高度：装页后块高与块内的演算留白都由 JS 定死（mm）。
   * 向下取到 0.1mm——四舍五入时每块最多多出 0.05mm，一页七八块累计起来
   * 会超出内容区，把页脚顶下去甚至多挤出一张空白页。
   */
  function heightStyle(mm) {
    return mm ? ' style="height:' + (Math.floor(mm * 10) / 10).toFixed(1) + 'mm"' : ''
  }

  /*
   * 题目块：题号 + 题干 + 演算留白 + 答句挖空行 + 收尾留白。
   * 演算留白高度由装页时算好（workMM）写死，不再 flex 撑满——否则一页题少时
   * 这道缝隙会被撑到三四厘米，答题线离题干老远；多出来的高度交给块尾的
   * .aq-tail，落在答题线下方当作题与题之间的呼吸空间。
   */
  function questionBlockHTML(q, idx, mm, workMM) {
    var p = P()
    return (
      '<div class="aq"' + heightStyle(mm) + '>' +
      '<div class="aq-stem"><span class="aq-num">' + p.numLabel(idx) + '</span>' +
      stemHTML(q) + '</div>' +
      '<div class="aq-work"' + heightStyle(workMM) + '></div>' +
      '<div class="aq-ans">' + (q.workLabel || '列式') + '：<span class="blank blank-expr"></span>　' +
      p.esc(q.ansLabel) + ' <span class="blank"></span> ' + p.esc(q.ansSuffix) +
      '</div>' +
      '<div class="aq-tail"></div>' +
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

  /*
   * 知识点讲解页：概念 → 思路（配图）→ 例题示范 → 口诀，内容来自 topic.lesson。
   *
   * 【例题按勾选的题型逐个给】。原先整页只有一个手写例题，可一个知识点有 2~4 种题型，
   * 方法常常完全不同 —— 16 间隔问题就是典型：锯木头是「+1」、爬楼梯是「−1」、
   * 排一排又是「+1」。只讲第一种，孩子照着做后两种必错。
   * 现在勾几种讲几种，不多不少：讲解页讲的就是这张卷子上会考的东西。
   *
   * 例题不手写，从题型【自己的生成器】里用定死的种子现取（util.lessonExample）。
   * 同源才不会走散：改了生成器的口径，讲解页自动跟着改。
   *
   * 返回的是【一块一块】的数组而不是一整坨 HTML —— 讲解页现在也要装页（见 lessonPages），
   * 得按块测高才切得动。每个例题自成一块，多出来的例题才能流到第二页去。
   */
  function lessonBlocks(topic, s) {
    var p = P()
    var blocks = []

    function sec(heading, body) {
      return (
        '<section class="lesson-sec">' +
        (heading ? '<h3 class="lesson-h">' + p.esc(heading) + '</h3>' : '') +
        body +
        '</section>'
      )
    }

    topic.lesson.sections.forEach(function (sc) {
      if (sc.perVariant) {
        var vs = root.SumSum.aoshu.util.selectedVariants(topic.variants, s)
        vs.forEach(function (v, i) {
          var q = root.SumSum.aoshu.util.lessonExample(v, s)
          if (!q) return // 取不到就跳过这一种，宁可少讲一段也不出半截例题
          var body =
            /* 题型名做小标题：一页上并排几个例题，不标名字就分不清哪个是哪个 */
            '<div class="lesson-example">' +
            '<div class="lesson-vtag">' + p.esc(v.label) + '</div>' +
            '<div class="lesson-stem">' + stemHTML(q) + '</div>' +
            (q.diagramHTML ? q.diagramHTML : q.diagram ? diagramHTML(q.diagram) : '') +
            stepsHTML(q.solution) +
            '</div>'
          /* 小标题只挂在第一个例题上：标题单独落在页底、例题翻到下一页最难看 */
          blocks.push(sec(i === 0 ? sc.heading : '', body))
        })
        return
      }
      var body = ''
      if (sc.paras) {
        body += sc.paras
          .map(function (t) {
            return '<p class="lesson-p">' + p.esc(t) + '</p>'
          })
          .join('')
      }
      if (sc.diagramHTML) body += sc.diagramHTML
      if (sc.diagram) body += diagramHTML(sc.diagram)
      /*
       * 「怎么想」也要按题型逐条给。上面那几段讲的是这个知识点的总思路，
       * 但每种题型的想法往往不是一回事（03：一种是「差÷2」、一种是「2n」、
       * 一种是「原差−2n」）。口诀是助记，可以只覆盖头一种；思路不行 ——
       * 思路就是方法本身，漏掉哪种题型，那种题型就等于没讲。
       *
       * 每条一句话，写在题型定义旁边（variant.idea），和生成器同处一地，
       * 改了出题口径能顺手改到它，不至于像原先的手写例题那样悄悄走散。
       */
      if (sc.perVariantIdea) {
        var ideas = root.SumSum.aoshu.util.selectedVariants(topic.variants, s)
          .filter(function (v) { return v.idea })
          .map(function (v) {
            return (
              '<li><span class="lesson-vtag">' + p.esc(v.label) + '</span>' +
              p.esc(v.idea) + '</li>'
            )
          })
          .join('')
        if (ideas) body += '<ul class="lesson-ideas">' + ideas + '</ul>'
      }
      if (sc.chant) body += '<div class="lesson-chant">' + p.esc(sc.chant) + '</div>'
      blocks.push(sec(sc.heading, body))
    })
    return blocks
  }

  /* 按顺序贪心塞，得到「最少要几页」。块不可切分，超过 capacity 只能另起一页 */
  function minPages(heights) {
    var k = 1
    var cur = 0
    heights.forEach(function (h) {
      if (cur + h > MM.capacity && cur > 0) {
        k++
        cur = 0
      }
      cur += h
    })
    return k
  }

  /*
   * 页数定死为 k，再把块【尽量摊匀】——目标是让最高的那一页尽量矮。
   *
   * 为什么不能就用贪心的结果：贪心会把前面的页塞满，末页只剩一个例题，
   * 三分之二是空白（实测 03 勾满三种题型就是 206mm + 78mm 这样一张脸）。
   * 摊匀之后是 153mm + 131mm，两页都像正经一页。
   * 这和题目页 tryEven 是同一个心思，只是那边按题数分、这边按高度分。
   *
   * 块数最多十来个、页数最多三四页，直接 DP 求「最小化最大页高」的线性划分，
   * 快得可以忽略。返回 [[起, 止), ...]。
   */
  function balanceCuts(heights, k) {
    var n = heights.length
    if (k <= 1 || n <= 1) return [[0, n]]
    var pre = [0]
    heights.forEach(function (h, i) {
      pre.push(pre[i] + h)
    })
    function sum(a, b) {
      return pre[b] - pre[a]
    }
    /* best[p][i] = 把前 i 块分成 p 页时，最高一页的高度；from 记回溯点 */
    var best = [], from = []
    for (var p = 0; p <= k; p++) {
      best.push(new Array(n + 1).fill(Infinity))
      from.push(new Array(n + 1).fill(0))
    }
    best[0][0] = 0
    for (p = 1; p <= k; p++) {
      for (var i = 1; i <= n; i++) {
        for (var j = p - 1; j < i; j++) {
          if (best[p - 1][j] === Infinity) continue
          var v = Math.max(best[p - 1][j], sum(j, i))
          if (v < best[p][i]) {
            best[p][i] = v
            from[p][i] = j
          }
        }
      }
    }
    /* 摊匀后仍有一页超高 = 这个 k 本来就装不下，退回贪心（贪心保证不超） */
    if (best[k][n] > MM.capacity + 0.1) {
      var out = [], start = 0, cur = 0
      heights.forEach(function (h, idx) {
        if (cur + h > MM.capacity && idx > start) {
          out.push([start, idx])
          start = idx
          cur = 0
        }
        cur += h
      })
      out.push([start, n])
      return out
    }
    var cuts = []
    var end = n
    for (p = k; p >= 1; p--) {
      var st = from[p][end]
      cuts.unshift([st, end])
      end = st
    }
    return cuts
  }

  /*
   * 讲解页装页。以前是写死一页（pageNo:1/pageTotal:1）—— 那时整页只有一个例题，
   * 塞得下。现在勾满 3~4 种题型就可能装不下，必须真的会翻页，否则内容会溢出纸外，
   * 屏幕上还看不出来（.lesson-flow 打印时才锁 225mm）。
   *
   * 跟题目页那套 packPages 不同，这里【不给内联高度、不摊分余量】：
   * 讲解页是散文排版，硬塞块高会把段落吹得东一块西一块。只定哪几块归哪一页。
   */
  function lessonPages(container, topic, s, title) {
    var blocks = lessonBlocks(topic, s)
    var heights = measureMM(container, 'lesson-flow', blocks.join(''))
    var cuts = balanceCuts(heights, minPages(heights))
    var pages = cuts.map(function (c) {
      return blocks.slice(c[0], c[1]).join('')
    })
    return pages.map(function (pg, i) {
      return pageHTML({
        title: title,
        blocksHTML: pg,
        gridClass: 'lesson-flow',
        pageNo: i + 1,
        pageTotal: pages.length,
        footPrefix: '讲解 · '
      })
    })
  }

  /* 解析块：题干重印（小号灰字）+ 圆点图示（若有）+ 分步骤讲解 + 加粗答句。
     综合复习卷里各题来自不同知识点，题号后标出是哪个，家长一眼知道在考什么。 */
  function solutionBlockHTML(q, idx, mm) {
    var p = P()
    return (
      '<div class="sol"' + heightStyle(mm) + '>' +
      '<div class="sol-stem"><span class="aq-num">' + p.numLabel(idx) + '</span>' +
      (q.topicLabel ? '<span class="sol-topic">' + p.esc(q.topicLabel) + '</span>' : '') +
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
   *
   * 【必须把下外边距算进去】。offsetHeight 不含 margin，而讲解页的
   * .lesson-sec 带 margin-bottom: 6mm —— 漏算的话六块就少算 36mm，
   * 装页以为放得下，打印出来直接溢出纸外（这个坑实测让 59 组超高）。
   * 题目块 .aq / 解析块 .sol 本来就没有 margin，加上这一项对它们是零影响。
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
      probe.querySelectorAll('.aq, .sol, .lesson-sec'),
      function (b) {
        var mb = parseFloat(root.getComputedStyle(b).marginBottom) || 0
        return (b.offsetHeight + mb) / pxPerMm
      }
    )
    container.removeChild(probe)
    return heights
  }

  /*
   * 装页：先按最小留白算出每块占位（不低于 minH），贪心装满 capacity 换页——
   * 题量决定的是总题数，一页排得下就压在一页，排不下才多开一页；
   * stretch 时把页内剩余高度平摊给各块（单块最多长到内容 + 两处留白上限），让整页舒展。
   * 返回 [{ idx: [题目下标], slots: [块高 mm], works: [演算留白 mm] }]。
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
    /*
     * 摊分页面余量：单块最多长到「内容 + 演算上限 + 收尾上限」，
     * 题少时宁可页底留白，也不把一道一行的题吹成半页高。
     */
    if (opts.stretch) {
      pages.forEach(function (pg) {
        var share = (MM.capacity - pg.total) / pg.slots.length
        pg.slots = pg.slots.map(function (s, j) {
          var cap = heights[pg.idx[j]] + MM.workMax + MM.tailMax
          return Math.max(s, Math.min(cap, s + share))
        })
      })
    }
    /* 演算留白：块高减去内容，但不超过上限；超出的部分由 .aq-tail 吃掉 */
    pages.forEach(function (pg) {
      pg.works = pg.slots.map(function (s, j) {
        return Math.max(0, Math.min(s - heights[pg.idx[j]], opts.workMax || opts.pad))
      })
    })
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
          return opts.blockHTML(questions[qi], qi + 1, pg.slots[j], pg.works[j])
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

  /*
   * 主入口：（可选）讲解页 + 题目页 + （可选）解析页。
   * opts.review = 综合复习卷：题目来自多个知识点，讲解页无从谈起，标题另取。
   */
  function render(container, s, questions, opts) {
    opts = opts || {}
    var topic = root.SumSum.aoshu.topics[s.topic]
    var title = s.title || (opts.review
      ? '综合复习 · 已学 ' + (opts.topicCount || 0) + ' 个知识点'
      : topic.titleFor(s))
    var html = []

    if (!opts.review && s.lessonPage && topic.lesson) {
      html = html.concat(lessonPages(container, topic, s, topic.lesson.title))
    }

    html = html.concat(
      sheetsHTML(container, questions, {
        title: title,
        gridClass: 'aoshu-grid',
        blockHTML: questionBlockHTML,
        pad: MM.workMin,
        workMax: MM.workMax,
        minH: MM.minQ,
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
