/**
 * 练习纸渲染与分页。
 *
 * 采用 JS 显式分页（而非浏览器自动分页）：按纸张方向算出每页行数，
 * 每页题数 = 行数 × 列数，切块渲染成多个 .sheet —— 这样每页都自带
 * 页眉（标题 + 姓名/日期/用时/得分）和页脚（第 i 页 / 共 n 页），
 * 且题目永远不会被分页截断。题目按「先横后竖」编号（网格行优先）。
 */
(function (root) {
  'use strict'

  /* 每页行数：A4 纵向内容区约 267mm、横向约 180mm，行高 15mm，留出页眉页脚 */
  var ROWS = { portrait: 15, landscape: 9 }

  var CIRCLED =
    '①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳' +
    '㉑㉒㉓㉔㉕㉖㉗㉘㉙㉚㉛㉜㉝㉞㉟㊱㊲㊳㊴㊵' +
    '㊶㊷㊸㊹㊺㊻㊼㊽㊾㊿'

  function esc(str) {
    return String(str).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]
    })
  }

  /* 题号：1~50 用圆圈数字 ①～㊿，之后退化为「51.」 */
  function numLabel(n) {
    return n <= 50 ? CIRCLED.charAt(n - 1) : n + '.'
  }

  /*
   * 单题算式 HTML。
   * 题目页：挖空处渲染下划线；挖操作数时结果照常印出（如 12 + ▁▁ = 17）。
   * 答案页：完整算式，被挖的值加粗；带余数除法显示「3……2」。
   */
  function exprHTML(q, showAnswer) {
    var parts = q.tokens.map(function (t, i) {
      if (typeof t !== 'number') return '<span class="op">' + t + '</span>'
      if (q.blank === i) {
        return showAnswer
          ? '<b class="filled">' + t + '</b>'
          : '<span class="blank"></span>'
      }
      return '<span>' + t + '</span>'
    })

    var answerText = q.answer + (q.remainder ? '……' + q.remainder : '')
    var tail
    if (showAnswer) {
      tail =
        q.blank === 'ans'
          ? '<b class="filled">' + answerText + '</b>'
          : '<span>' + answerText + '</span>'
    } else if (q.blank === 'ans') {
      tail = '<span class="blank blank-ans"></span>'
    } else {
      tail = '<span>' + answerText + '</span>'
    }
    return parts.join(' ') + ' <span class="op">=</span> ' + tail
  }

  /* 页眉日期自动填当天（生成练习纸的当天即做题的当天，无需家长手填） */
  function todayLabel() {
    var now = new Date()
    return now.getMonth() + 1 + ' 月 ' + now.getDate() + ' 日'
  }

  /* 页眉「日期 姓名 用时 得分」一栏，口算页与奥数页共用 */
  function metaHTML() {
    return (
      '<div class="sheet-meta">' +
      '<span class="meta-date">' + todayLabel() + '</span>' +
      '<span class="gap"></span>姓名<span class="line w-l"></span>' +
      '<span class="gap"></span>用时<span class="line w-s"></span>分' +
      '<span class="gap"></span>得分<span class="line w-m"></span>' +
      '</div>'
    )
  }

  function cellHTML(q, idx, showAnswer) {
    return (
      '<div class="q"><span class="q-num">' +
      numLabel(idx) +
      '</span><span class="q-expr">' +
      exprHTML(q, showAnswer) +
      '</span></div>'
    )
  }

  function pageHTML(opts) {
    var cells = opts.questions
      .map(function (q, i) {
        return cellHTML(q, opts.startIdx + i, opts.showAnswer)
      })
      .join('')
    return (
      '<section class="sheet" data-cols="' + opts.cols + '">' +
      '<header class="sheet-head">' +
      '<h2 class="sheet-title">' + esc(opts.title) + '</h2>' +
      metaHTML() +
      '</header>' +
      '<div class="sheet-grid" style="--cols:' + opts.cols + '">' + cells + '</div>' +
      '<footer class="sheet-foot">' +
      opts.footPrefix + '第 ' + opts.pageNo + ' 页 / 共 ' + opts.pageTotal + ' 页' +
      '</footer>' +
      '</section>'
    )
  }

  function paginate(list, perPage) {
    var pages = []
    for (var i = 0; i < list.length; i += perPage) {
      pages.push(list.slice(i, i + perPage))
    }
    return pages
  }

  /*
   * 长算式防溢出：先把每格缩到刚好放下，再取整张纸的最小字号统一应用，
   * 保证同一页字号一致。屏幕与打印的栏宽同为 mm 单位，缩放结果一致。
   * 缩到下限仍放不下的（四则运算 4 列会遇到），最后让算式折行——
   * 宁可这一格排得挤一点，也绝不能把算式或答案裁掉。
   */
  var MIN_FONT = 11

  function fitSheet(sheet) {
    var cells = sheet.querySelectorAll('.q')
    var minSize = Infinity
    Array.prototype.forEach.call(cells, function (cell) {
      var expr = cell.querySelector('.q-expr')
      var size = parseFloat(root.getComputedStyle(expr).fontSize)
      while (cell.scrollWidth > cell.clientWidth + 1 && size > MIN_FONT) {
        size -= 1
        expr.style.fontSize = size + 'px'
      }
      if (size < minSize) minSize = size
    })
    if (minSize === Infinity) return
    Array.prototype.forEach.call(cells, function (cell) {
      cell.querySelector('.q-expr').style.fontSize = minSize + 'px'
    })
    /* 统一字号后仍溢出的格子改为折行显示，保证内容完整 */
    Array.prototype.forEach.call(cells, function (cell) {
      cell.classList.toggle('q-wrap', cell.scrollWidth > cell.clientWidth + 1)
    })
  }

  /* 主入口：把一批题目渲染成若干张练习纸（可选追加同排版的答案页） */
  function render(container, s, questions) {
    var title = s.title || root.SumSum.generator.titleFor(s)
    var perPage = ROWS[s.paper] * s.columns
    var pages = paginate(questions, perPage)
    var html = []

    pages.forEach(function (page, p) {
      html.push(
        pageHTML({
          title: title,
          questions: page,
          startIdx: p * perPage + 1,
          cols: s.columns,
          pageNo: p + 1,
          pageTotal: pages.length,
          showAnswer: false,
          footPrefix: ''
        })
      )
    })

    if (s.answerPage) {
      pages.forEach(function (page, p) {
        html.push(
          pageHTML({
            title: title + '（答案）',
            questions: page,
            startIdx: p * perPage + 1,
            cols: s.columns,
            pageNo: p + 1,
            pageTotal: pages.length,
            showAnswer: true,
            footPrefix: '答案 · '
          })
        )
      })
    }

    container.innerHTML = html.join('')
    root.document.body.classList.toggle('landscape', s.paper === 'landscape')
    Array.prototype.forEach.call(container.querySelectorAll('.sheet'), fitSheet)
  }

  /* 供 beforeprint 调用：页面开着隔天再打印时，把日期刷新为当天 */
  function refreshDates() {
    var nodes = root.document.querySelectorAll('.meta-date')
    Array.prototype.forEach.call(nodes, function (el) {
      el.textContent = todayLabel()
    })
  }

  root.SumSum = root.SumSum || {}
  root.SumSum.render = {
    render: render,
    refreshDates: refreshDates,
    /* 供奥数页等其他纸张类型复用的零件（纯函数，无状态） */
    parts: { esc: esc, todayLabel: todayLabel, numLabel: numLabel, metaHTML: metaHTML }
  }
})(typeof window !== 'undefined' ? window : globalThis)
