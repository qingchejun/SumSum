/**
 * 数独练习纸渲染。
 *
 * 与口算/奥数不同，这里是【一页一大题】：格子印大、好下笔，适合一年级孩子
 * 握着铅笔慢慢写。所以没有装页算法——每道题固定一张纸，分页由
 * .sheet { break-after: page } 天然完成。
 *
 * 对战双份（copies === 2）在这一层做：同一道题连印两张，父子各一张同题比赛。
 * 页脚标「第 i 题 / 共 n 题」而不是页码——双份时页码会翻倍，容易看糊涂。
 *
 * 答案页是末尾集中的小图，一页 6 个（2 列 × 3 行），家长对答案用。
 */
(function (root) {
  'use strict'

  /* 复用口算渲染器导出的零件（esc / todayLabel / numLabel / metaHTML） */
  function P() {
    return root.SumSum.render.parts
  }

  /*
   * 排版尺寸（mm）。A4 纵向：.sheet 210×297、padding 15mm → 内容区 180mm 宽。
   * 扣掉页眉（约 17mm）与页脚（约 10mm）后可用高取 225mm —— 与口算
   * js/render.js 的 AREA_MM.portrait、css/sheet.css 打印段的 .sheet-grid
   * { min-height: 225mm } 是同一个数，css/shudu.css 的 .sudoku-stage 也用它。
   */
  var MM = {
    boardMax: 168, // 题目页盘的最大边长（180mm 内容区两边各留 6mm）
    cellMax: 45, // 单格边长上限：三宫格按 168/3=56mm 会大到一格快 6cm，封顶
    ansBoard: 60, // 答案页小图边长；2 列×3 行 → 宽 2×60+10=130，高 3×(60+6)+2×10=218，都在界内
    ansCols: 2,
    ansRows: 3
  }

  var ANS_PER_PAGE = MM.ansCols * MM.ansRows

  /* 题目页每格多大：等分盘宽，但不超过 cellMax */
  function cellMM(n) {
    return Math.min(MM.cellMax, MM.boardMax / n)
  }

  /*
   * 所有内联 mm 一律向下取到 0.1mm。四舍五入时每格多出的 0.05mm 累计起来
   * 会超出内容区，多挤一张空白页 —— 这是本项目在口算/奥数上都踩过的坑。
   */
  function mm(v) {
    return Math.floor(v * 10) / 10 + 'mm'
  }

  /*
   * 一个数独盘的 HTML。
   * 粗线靠给格子打 .bb（宫的下边界）/ .br（宫的右边界）实现，而不是画额外的线，
   * 这样格子尺寸不受线宽影响，打印出来行列严格对齐。三宫格没有宫，一条粗线都不打。
   */
  function boardHTML(q, opts) {
    var SD = root.SumSum.shudu
    var sp = SD.shapeOf(q.shape)
    var n = sp.n
    var grid = opts.showAnswer ? q.solution : q.puzzle
    var cells = []

    for (var i = 0; i < grid.length; i++) {
      var r = Math.floor(i / n)
      var c = i % n
      var cls = ['cell']
      /* 宫的内部边界加粗；最后一行/列不用，外框已经有粗边 */
      if (sp.bh && (r + 1) % sp.bh === 0 && r !== n - 1) cls.push('bb')
      if (sp.bw && (c + 1) % sp.bw === 0 && c !== n - 1) cls.push('br')

      var v = grid[i]
      var isGiven = q.puzzle[i] !== 0
      var text = v ? String(v) : ''

      if (opts.showAnswer) {
        /* 答案页：题面自带的提示用常规字重，挖空处加粗，家长一眼看出该填什么 */
        cls.push(isGiven ? 'given' : 'ans')
        cells.push('<div class="' + cls.join(' ') + '">' + text + '</div>')
      } else if (isGiven) {
        cls.push('given')
        cells.push('<div class="' + cls.join(' ') + '">' + text + '</div>')
      } else {
        /* 空格：在线玩时由 shudu-play.js 接管点击，打印时就是一个空格子 */
        cls.push('blank')
        cells.push(
          '<div class="' + cls.join(' ') + '" data-i="' + i + '" role="button" tabindex="0"></div>'
        )
      }
    }

    var side = opts.cell * n
    return (
      '<div class="sudoku" data-n="' + n + '" data-shape="' + q.shape + '"' +
      ' style="width:' + mm(side) + ';height:' + mm(side) +
      ';grid-template-columns:repeat(' + n + ',' + mm(opts.cell) + ')' +
      ';grid-auto-rows:' + mm(opts.cell) + '">' +
      cells.join('') +
      '</div>'
    )
  }

  /* 页眉：标题 + 「日期 姓名 用时 得分」一栏，与口算/奥数共用零件 */
  function headHTML(title) {
    return (
      '<header class="sheet-head">' +
      '<h2 class="sheet-title">' + P().esc(title) + '</h2>' +
      P().metaHTML() +
      '</header>'
    )
  }

  /* 题目页：一整张纸就一道题，盘在正中间 */
  function puzzleSheetHTML(q, opts) {
    var SD = root.SumSum.shudu
    var sp = SD.shapeOf(q.shape)
    /* 没有宫的盘型（bh 为 0）只说行和列，免得孩子照着找不存在的粗框 */
    var rule = sp.bh
      ? '每行、每列、每个粗框小宫都要有 1~' + sp.n + '，各出现一次'
      : '每行、每列都要有 1~' + sp.n + '，各出现一次'

    return (
      '<section class="sheet sheet-sudoku">' +
      headHTML(opts.title) +
      '<div class="sudoku-stage">' +
      '<div class="sudoku-wrap">' +
      '<p class="sudoku-rule">' + P().numLabel(opts.idx) + ' ' + P().esc(rule) + '</p>' +
      boardHTML(q, { cell: cellMM(sp.n), showAnswer: false }) +
      '</div>' +
      '</div>' +
      '<footer class="sheet-foot">第 ' + opts.idx + ' 题 / 共 ' + opts.total + ' 题' +
      (opts.copyNo ? '　·　第 ' + opts.copyNo + ' 份' : '') +
      '</footer>' +
      '</section>'
    )
  }

  /* 答案页：一页 6 个小图 */
  function answerSheetHTML(list, opts) {
    var SD = root.SumSum.shudu
    var items = list.map(function (entry) {
      var q = entry.q
      var n = SD.shapeOf(q.shape).n
      return (
        '<div class="ans-item">' +
        '<span class="ans-no">' + P().numLabel(entry.idx) + '</span>' +
        boardHTML(q, { cell: MM.ansBoard / n, showAnswer: true }) +
        '</div>'
      )
    })

    return (
      '<section class="sheet sheet-sudoku-ans">' +
      headHTML(opts.title + '（答案）') +
      '<div class="ans-grid" style="grid-template-columns:repeat(' + MM.ansCols + ',' +
      mm(MM.ansBoard) + ')">' + items.join('') + '</div>' +
      '<footer class="sheet-foot">答案 · 第 ' + opts.pageNo + ' 页 / 共 ' + opts.pageTotal + ' 页</footer>' +
      '</section>'
    )
  }

  /* 主入口：把一批数独渲染成若干张练习纸 */
  function render(container, s, puzzles) {
    var title = s.title || root.SumSum.shudu.titleFor(s)
    var html = []

    puzzles.forEach(function (q, i) {
      /*
       * 对战模式：同一道题原样再印一份紧跟其后，父子各拿一张同题开跑。
       * 两份内容完全一致（同一个 q），只有页脚的「第 N 份」不同。
       */
      for (var c = 1; c <= s.copies; c++) {
        html.push(
          puzzleSheetHTML(q, {
            title: title,
            idx: i + 1,
            total: puzzles.length,
            copyNo: s.copies > 1 ? c : 0
          })
        )
      }
    })

    if (s.answerPage && puzzles.length) {
      var entries = puzzles.map(function (q, i) {
        return { q: q, idx: i + 1 }
      })
      var pageTotal = Math.ceil(entries.length / ANS_PER_PAGE)
      for (var p = 0; p < pageTotal; p++) {
        html.push(
          answerSheetHTML(entries.slice(p * ANS_PER_PAGE, (p + 1) * ANS_PER_PAGE), {
            title: title,
            pageNo: p + 1,
            pageTotal: pageTotal
          })
        )
      }
    }

    container.innerHTML = html.join('')
    /* 数独页固定 A4 纵向，不用像口算那样切 body.landscape */
    root.document.body.classList.remove('landscape')
  }

  root.SumSum = root.SumSum || {}
  root.SumSum.shuduRender = {
    render: render,
    MM: MM,
    cellMM: cellMM
  }
})(typeof window !== 'undefined' ? window : globalThis)
