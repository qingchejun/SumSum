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

  /*
   * 题号：1~50 有现成的圆圈数字 ①～㊿；再往后 Unicode 没有对应字符，
   * 原先退化成「51.」，同一页上两种样式并排很突兀。改为统一加圆括号，
   * 视觉上与圆圈数字接得上。
   */
  function numLabel(n) {
    return n <= 50 ? CIRCLED.charAt(n - 1) : '(' + n + ')'
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

  /*
   * 答案页上的凑十 / 破十提示：孩子算错时，家长照着这一行就能讲，
   * 不必自己现想拆法（奥数板块每题都有分步解析，口算这边原先只有一个数字）。
   * 只覆盖 20 以内最核心的两种情形——加数/减数不超过 10 的进位加与退位减，
   * 其余（如 23−17）拆法不唯一，讲起来反而绕，就不给提示。
   */
  function stepHint(q) {
    var t = q.tokens
    if (t.length !== 3) return ''
    var a = t[0]
    var op = t[1]
    var b = t[2]
    if (typeof a !== 'number' || typeof b !== 'number' || b > 10) return ''
    if (op === '+' && a >= 1 && a % 10 !== 0 && (a % 10) + (b % 10) >= 10) {
      var need = 10 - (a % 10)
      var rest = b - need
      /* rest 为 0 说明正好凑满整十，「分成 4 和 0」是废话，不给提示 */
      if (rest <= 0) return ''
      /* 写法尽量短：3、4 列时栏宽只有百来像素，长句子会撑破格子 */
      return '凑十：' + a + '+' + need + '=' + (a + need) + '，' + (a + need) + '+' + rest
    }
    if (op === '−' && a > 10 && a % 10 < b % 10 && a - b >= 0) {
      var low = a - 10
      /* a 正好是 10 时「10 分成 0 和 10」是废话，本来也不用破十（已在上面排除） */
      return '破十：10−' + b + '=' + (10 - b) + '，' + (10 - b) + '+' + low
    }
    return ''
  }

  function cellHTML(q, idx, showAnswer, withHint) {
    var hint = withHint && showAnswer ? stepHint(q) : ''
    return (
      '<div class="q' + (hint ? ' has-hint' : '') + '"><span class="q-num">' +
      numLabel(idx) +
      '</span><span class="q-body"><span class="q-expr">' +
      exprHTML(q, showAnswer) +
      '</span>' +
      (hint ? '<span class="q-hint">' + esc(hint) + '</span>' : '') +
      '</span></div>'
    )
  }

  function pageHTML(opts) {
    var cells = opts.questions
      .map(function (q, i) {
        return cellHTML(q, opts.startIdx + i, opts.showAnswer, opts.stepHint)
      })
      .join('')
    return (
      '<section class="sheet" data-cols="' + opts.cols + '">' +
      '<header class="sheet-head">' +
      '<h2 class="sheet-title">' + esc(opts.title) + '</h2>' +
      metaHTML() +
      '</header>' +
      '<div class="sheet-grid" style="--cols:' + opts.cols +
      ';grid-auto-rows:' + opts.rowMM.toFixed(1) + 'mm">' + cells + '</div>' +
      '<footer class="sheet-foot">' +
      opts.footPrefix + '第 ' + opts.pageNo + ' 页 / 共 ' + opts.pageTotal + ' 页' +
      '</footer>' +
      '</section>'
    )
  }

  /*
   * 分页并把题目在各页间摊匀：直接按 perPage 切会让最后一页只剩零星几题
   * （40 题 3 列 → 45 + 0 不均；60 题 2 列 → 30 + 30 正好，但 40 题会变成
   * 30 + 10）。页数不变的前提下均分，卷面各页疏密一致。
   */
  function paginate(list, perPage) {
    var k = Math.ceil(list.length / perPage) || 1
    var base = Math.floor(list.length / k)
    var extra = list.length % k // 前 extra 页各多一题，如 100 题 3 页 → 34+33+33
    var pages = []
    var at = 0
    for (var p = 0; p < k; p++) {
      var take = base + (p < extra ? 1 : 0)
      pages.push(list.slice(at, at + take))
      at += take
    }
    return pages
  }

  /*
   * 行高：题目占不满一页时把剩余高度摊给各行，孩子多点书写空间，
   * 也不至于挤在纸张上三分之一、下面大片空白（实测 20 题 2 列会空 33%）。
   * 上限 ROW_MAX，免得三两道题把行距撑得莫名其妙。
   */
  var ROW_MIN = 15 // mm，与 css/sheet.css 的 grid-auto-rows 对应
  var ROW_MAX = 24
  var AREA_MM = { portrait: 225, landscape: 135 } // 与打印段 min-height 对应

  function rowHeightMM(count, cols, paper) {
    var rows = Math.ceil(count / cols) || 1
    var h = AREA_MM[paper] / rows
    /* 向下取到 0.1mm：四舍五入会让 行高×行数 超出内容区，多挤出一张空白页 */
    h = Math.floor(h * 10) / 10
    return Math.max(ROW_MIN, Math.min(ROW_MAX, h))
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
    /* 各页起始题号：均分后每页题数可能不同，不能再用 p × perPage 推算 */
    var startIdx = []
    var acc = 1
    pages.forEach(function (page) {
      startIdx.push(acc)
      acc += page.length
    })

    function sheetsFor(suffix, showAnswer, footPrefix) {
      pages.forEach(function (page, p) {
        html.push(
          pageHTML({
            title: title + suffix,
            questions: page,
            startIdx: startIdx[p],
            cols: s.columns,
            rowMM: rowHeightMM(page.length, s.columns, s.paper),
            stepHint: s.stepHint,
            pageNo: p + 1,
            pageTotal: pages.length,
            showAnswer: showAnswer,
            footPrefix: footPrefix
          })
        )
      })
    }

    sheetsFor('', false, '')
    if (s.answerPage) sheetsFor('（答案）', true, '答案 · ')

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
