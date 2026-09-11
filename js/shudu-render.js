/**
 * 数独练习纸渲染。
 *
 * 排版原则是【格子尽量印大】：一张 A4 上放几道题由 layout() 按盘型算出来，
 * 而不是写死。四宫格一页能放 4 题还剩 20mm 一格（比田字格还大），
 * 九宫格放 2 题就只剩 10mm 一格、孩子写不下，所以九宫格仍然一页一题。
 * 用户也可以在面板上直接指定每页几题（见 shudu-settings 的 perPage）。
 *
 * 对战双份（copies === 2）在这一层做：同一页连印两张，父子各一张同题比赛。
 * 页脚标「第 i~j 题 / 共 n 题」而不是页码——双份时页码会翻倍，容易看糊涂。
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
   * 排版尺寸（mm）。A4 纵向：.sheet 210×297、padding 15mm → 内容区 180×297，
   * 扣掉页眉（约 17mm）与页脚（约 10mm）后可用高 225mm —— 与口算
   * js/render.js 的 AREA_MM.portrait、css/sheet.css 打印段的 .sheet-grid
   * { min-height: 225mm } 是同一个数，css/shudu.css 的 .sudoku-stage 也用它。
   *
   * fitW / fitH 是排多题时算格子用的版心，故意比真实的 180×225 各收 2~3mm：
   * 本项目在口算和奥数上都栽过「内联 mm 一路累加、超出内容区、多挤一张空白页」，
   * 留出余量比事后去调可靠得多。
   */
  var MM = {
    boardMax: 168, // 一页一题时盘的最大边长（180mm 内容区两边各留 6mm）
    cellMax: 45, // 单格边长上限：一页一题的四宫格按 168/4=42mm 已经很大了，封顶
    fitW: 178, // 排多题时的可用宽
    fitH: 222, // 排多题时的可用高
    gap: 8, // 盘与盘之间的间距
    noteH: 7, // 每个盘上方那行题号占的高（.sudoku-no）
    ruleH: 9, // 多题时页顶那行规则说明占的高（.sudoku-rule-top）
    /* 盘的外框是 border 且 box-sizing: content-box，不算在 grid 的 width 里，
       所以算格子时要先把它刨掉（1.2mm × 2，取整到 3mm），否则每个盘都会比
       算出来的槽位宽 2.4mm —— 两列就是 4.8mm，正好够溢出一页。 */
    frame: 3,
    /* 「自动」挡的底线：格子不小于 15mm。一年级田字格是 12~15mm，
       再小孩子的字就写出格了 —— 而这个模块的整个卖点就是「印大、好下笔」。 */
    cellMin: 15,
    /* 一页最多 4 题。四宫格按 15mm 的底线其实能塞下 9 题，但那就成了
       数独书的一页，而不是「比谁先做完」的一张练习纸了。 */
    maxPerPage: 4,
    /* 字号 = 格子边长 × 比例，但不小于 fontMin。比例是照着改造前那套写死的
       px 字号反推的（30px/42mm、24px/28mm、17px/18.6mm），所以一页一题时
       印出来和以前一模一样，只有盘变小时才由 fontMin 接管。 */
    fontRatio: { 4: 0.19, 6: 0.227, 9: 0.242 },
    fontMin: 4,
    ansBoard: 60, // 答案页小图边长；2 列×3 行 → 宽 2×60+10=130，高 3×(60+6)+2×10=218，都在界内
    ansCols: 2,
    ansRows: 3
  }

  var ANS_PER_PAGE = MM.ansCols * MM.ansRows

  /* 一页一题时每格多大：等分盘宽，但不超过 cellMax */
  function cellMM(n) {
    return Math.min(MM.cellMax, MM.boardMax / n)
  }

  /*
   * 一页放 per 题时怎么排。
   *
   * 把 per 个盘摆成 cols 列 × rows 行（rows = ⌈per/cols⌉，最后一行可以不满），
   * 逐个 cols 试过去，取【格子最大】的那种排法 —— 版面好不好看是次要的，
   * 格子够不够写才是这个模块的立身之本。所以两题时常常是上下摞着（盘宽 95mm、
   * 一格 23mm）而不是左右并排（盘宽 85mm、一格 20mm），左右两边会空出来一些，
   * 但孩子下笔的地方更大。
   *
   * 返回的 cell 是最终格子边长，side = cell × n 是盘的 grid 尺寸（不含外框）。
   */
  function layout(shapeKey, per) {
    var n = root.SumSum.shudu.shapeOf(shapeKey).n
    if (per <= 1) {
      var one = cellMM(n)
      return { per: 1, cols: 1, cell: one, side: one * n }
    }
    var best = null
    for (var cols = 1; cols <= per; cols++) {
      var rows = Math.ceil(per / cols)
      var w = (MM.fitW - (cols - 1) * MM.gap) / cols
      var h = (MM.fitH - MM.ruleH - rows * MM.noteH - (rows - 1) * MM.gap) / rows
      var cell = Math.min(MM.cellMax, (Math.min(w, h, MM.boardMax) - MM.frame) / n)
      if (cell <= 0) continue
      /* 一样大就取列数多的：同样的格子大小，横向铺开比纵向摞着好看 */
      if (!best || cell >= best.cell) {
        best = { per: per, cols: cols, rows: rows, cell: cell, side: cell * n }
      }
    }
    return best
  }

  /* 「自动」：在不把格子压到 cellMin 以下的前提下，一页尽量多放几题。
     实测结果是四宫格 4 题（一格 20.5mm）、六宫格 2 题（15.4mm）、九宫格 1 题（42mm→18.6mm）。 */
  function autoPerPage(shapeKey) {
    for (var k = MM.maxPerPage; k > 1; k--) {
      if (layout(shapeKey, k).cell >= MM.cellMin) return k
    }
    return 1
  }

  /*
   * 这一批题实际每页放几道。题目比一页的容量还少时按实际题数排
   * （只出 1 道却按 4 题的尺寸印，会白白把盘缩小一半）。
   */
  function perPageOf(s, count) {
    var want = s.perPage ? s.perPage : autoPerPage(s.shape)
    return Math.max(1, Math.min(want, count || 1))
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
    /*
     * 字号和线宽都随格子大小走，不能写死在 CSS 里 —— 同一个盘型现在可能是
     * 一页一题的 42mm 大格，也可能是一页四题的 20mm 小格，差一倍。
     *
     * 字号 = 格子的 19%~24%（三种盘型各自的比例见 FONT），但不小于 4mm：
     * 大盘上数字故意印得小，给孩子留出下笔的地方；盘一小，比例就顶不住了，
     * 得有个绝对下限保证看得清（答案页的小图正好落在这个下限上，15px，与改造前一致）。
     * 线宽同理：1.2mm 的宫线画在 42mm 的格子上是 3%，画在 20mm 的格子上就成了 6%，
     * 又重又挤掉写字的地方（九宫格当初单独调细到 0.9mm 就是这个原因，现在统一由公式给）。
     */
    var font = Math.max(MM.fontMin, opts.cell * (MM.fontRatio[n] || 0.2))
    var bd = Math.min(1.2, Math.max(0.6, opts.cell * 0.045))
    var bdi = Math.min(0.3, Math.max(0.18, opts.cell * 0.012))
    return (
      '<div class="sudoku" data-n="' + n + '" data-shape="' + q.shape + '"' +
      ' style="width:' + mm(side) + ';height:' + mm(side) +
      ';grid-template-columns:repeat(' + n + ',' + mm(opts.cell) + ')' +
      ';grid-auto-rows:' + mm(opts.cell) +
      ';font-size:' + mm(font) +
      ';--bd:' + mm(bd) + ';--bdi:' + mm(bdi) + '">' +
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

  /* 规则说明的措辞：没有宫的盘型（bh 为 0）只说行和列，免得孩子照着找不存在的粗框 */
  function ruleText(sp) {
    return sp.bh
      ? '每行、每列、每个粗框小宫都要有 1~' + sp.n + '，各出现一次'
      : '每行、每列都要有 1~' + sp.n + '，各出现一次'
  }

  /*
   * 题目页。list 是这一页上的题（[{ q, idx }]），可能是 1 道，也可能是 4 道。
   *
   * 一页一题时规则说明跟题号写在同一行、就在盘的正上方（和以前一样）；
   * 一页多题时规则提到页顶只说一遍，每个盘上方只留题号 —— 同一句话印四遍
   * 既占地方又吵，而规则本来就是整页通用的。
   */
  function puzzleSheetHTML(list, opts) {
    var SD = root.SumSum.shudu
    var sp = SD.shapeOf(list[0].q.shape)
    var multi = list.length > 1 || opts.lay.per > 1
    var items = list.map(function (entry) {
      var label = multi
        ? '<p class="sudoku-no">' + P().numLabel(entry.idx) + '</p>'
        : '<p class="sudoku-rule">' + P().numLabel(entry.idx) + ' ' + P().esc(ruleText(sp)) + '</p>'
      return (
        '<div class="sudoku-item">' + label +
        boardHTML(entry.q, { cell: opts.lay.cell, showAnswer: false }) +
        '</div>'
      )
    })

    var span = list.length > 1
      ? '第 ' + list[0].idx + '~' + list[list.length - 1].idx + ' 题'
      : '第 ' + list[0].idx + ' 题'

    return (
      '<section class="sheet sheet-sudoku">' +
      headHTML(opts.title) +
      '<div class="sudoku-stage">' +
      (multi ? '<p class="sudoku-rule-top">' + P().esc(ruleText(sp)) + '</p>' : '') +
      '<div class="sudoku-grid">' + items.join('') + '</div>' +
      '</div>' +
      '<footer class="sheet-foot">' + span + ' / 共 ' + opts.total + ' 题' +
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
    var per = perPageOf(s, puzzles.length)
    var lay = layout(s.shape, per)
    var html = []

    /* 先按每页几题切成一页一组，再逐页渲染 */
    for (var start = 0; start < puzzles.length; start += per) {
      var list = []
      for (var k = start; k < Math.min(start + per, puzzles.length); k++) {
        list.push({ q: puzzles[k], idx: k + 1 })
      }
      /*
       * 对战模式：同一页原样再印一份紧跟其后，父子各拿一张同题开跑。
       * 两份内容完全一致，只有页脚的「第 N 份」不同。
       */
      for (var c = 1; c <= s.copies; c++) {
        html.push(
          puzzleSheetHTML(list, {
            title: title,
            lay: lay,
            total: puzzles.length,
            copyNo: s.copies > 1 ? c : 0
          })
        )
      }
    }

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
    cellMM: cellMM,
    layout: layout,
    autoPerPage: autoPerPage,
    perPageOf: perPageOf
  }
})(typeof window !== 'undefined' ? window : globalThis)
