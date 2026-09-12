/**
 * 识字练习纸渲染。
 *
 * 排版原则和数独一样是【字尽量印大】：一页排几列不写死，而是枚举列数取字最大的那种排法
 * （见 layout）。100 个字的结果是 10 列 × 10 行、每字约 10.7mm —— 比课本生字还大，
 * 隔着桌子让孩子念也看得清。
 *
 * 卷面刻意做成纯字格：不印拼音、不印组词、不留勾选框。这是一张【认读考核卷】，
 * 孩子念、家长听，纸上任何多余的东西都是给孩子的线索。
 *
 * 另有一个「整表核对」模式（proof），按原始截图的 15×12 结构把整张字表印出来，
 * 用来核对人肉转录的字表有没有出错，不是给孩子做的。
 */
(function (root) {
  'use strict'

  /* 复用口算渲染器导出的零件（esc / todayLabel / numLabel / metaHTML） */
  function P() {
    return root.SumSum.render.parts
  }

  /*
   * 排版尺寸（mm）。A4 纵向：.sheet 210×297、padding 15mm → 内容区 180 宽，
   * 扣掉页眉（约 17mm）与页脚（约 10mm）后可用高 225mm —— 与口算 js/render.js 的
   * AREA_MM.portrait、css/sheet.css 打印段的 .sheet-grid { min-height: 225mm } 是同一个数。
   *
   * fitW / fitH 故意比真实的 180×225 各收 2~3mm：本项目在口算和奥数上都栽过
   * 「内联 mm 一路累加、超出内容区、多挤一张空白页」，留余量比事后去调可靠得多。
   */
  var MM = {
    fitW: 178,
    fitH: 222,
    /* 字号 = 格子短边 × 0.6。剩下的 40% 是字与格线之间的留白 ——
       字顶着格线会连成一片，孩子一行扫过去容易串行。 */
    fontRatio: 0.6,
    /* 字的下限 6mm（约 17pt）。再小就不是「大大方方一个字」而是一张密密麻麻的表了，
       家长指读时找不着位置。排不进这个下限就换成多页，而不是继续压小。 */
    glyphMin: 6,
    /*
     * 格子的上限 30mm（约课本生字的三倍）。有下限就得有上限 ——
     * 每周字数被改成 13 这类除不尽的数时，末周可能只剩 1 个字，
     * 不封顶就会排成【一个 178×222mm 的格子，里面一个 10.7cm 的字】。
     * 注意要封的是格子而不只是字号：光封字号，巨框还在，字浮在框中央更难看。
     * 与数独 shudu-render.js 的 cellMax 是同一类约束（那边封的是盘的格子）。
     */
    cellMax: 30,
    /*
     * 末行至少要有六成满。只按「字最大」挑的话，100 字会排成 9 列 × 12 行
     * （字 11.1mm，确实比 10×10 的 10.7mm 大），但最后一行孤零零只剩 1 个字，
     * 看着像印坏了。为这 0.4mm 不值得，宁可要一个方方正正的 10×10。
     */
    lastRowMin: 0.6
  }

  /*
   * 一页放 count 个字时怎么排。
   *
   * 逐个列数试过去，取【字最大】的那种排法。字的大小由格子的短边决定，
   * 所以最优解通常是让格子接近正方形 —— 100 字时 10 列 × 10 行（格子 17.8×22.2mm）
   * 就是这么来的，而不是我拍脑袋定的 10 列。
   *
   * 返回 null = 这个字数在字号下限内一页排不下，由 autoPer 换成多页。
   */
  function layout(count, forceCols) {
    if (count <= 0) return null

    function scan(needFullRow) {
      var best = null
      var lo = forceCols || 1
      var hi = forceCols || count
      for (var cols = lo; cols <= hi; cols++) {
        var rows = Math.ceil(count / cols)
        /* 先按版心等分，再各自封到 cellMax。封顶后格子撑不满整页是对的：
           末周就那么几个字，本来也不该铺满一张 A4。 */
        var w = Math.min(MM.fitW / cols, MM.cellMax)
        var h = Math.min(MM.fitH / rows, MM.cellMax)
        var glyph = Math.min(w, h) * MM.fontRatio
        if (!forceCols) {
          if (glyph < MM.glyphMin) continue
          var last = count - (rows - 1) * cols
          if (needFullRow && last / cols < MM.lastRowMin) continue
        }
        /* 一样大就取列数多的：同样的字号，横向铺开比纵向摞着更像一张卷子 */
        if (!best || glyph >= best.glyph) {
          best = { cols: cols, rows: rows, w: w, h: h, glyph: glyph }
        }
      }
      return best
    }

    /* 先在「末行够满」的排法里挑字最大的；字数是质数之类、一个都挑不出来时
       再放开这条约束，总比排不出来强。 */
    return scan(true) || scan(false)
  }

  /*
   * 「自动」挡：一页放得下就一页，放不下才分页。
   * 从 1 页开始往上加，第一个能排下的页数就是答案 —— 这样既保证页数最少，
   * 又保证每页字数均分（100 字分两页是 50+50，不会是 99+1）。
   */
  function autoPer(count) {
    for (var k = 1; k <= count; k++) {
      var per = Math.ceil(count / k)
      if (layout(per)) return per
    }
    return count
  }

  /* 这一批字实际每页放几个。手动挡不超过总字数（只印 30 个字却按 100 的尺寸排，白白把字缩小） */
  function perPageOf(s, count) {
    if (!count) return 1
    var want = s.perPage ? s.perPage : autoPer(count)
    return Math.max(1, Math.min(want, count))
  }

  /*
   * 所有内联 mm 一律向下取到 0.1mm。四舍五入时每格多出的 0.05mm 累计起来
   * 会超出内容区、多挤一张空白页 —— 这是本项目在口算/奥数上都踩过的坑。
   */
  function mm(v) {
    return Math.floor(v * 10) / 10 + 'mm'
  }

  /* 一页字格。dim 里的下标（相对 chars）渲染成灰字：整表核对时用来标出没纳入复习的尾巴 */
  function gridHTML(chars, lay, dim) {
    var cells = chars.map(function (ch, i) {
      var cls = dim && dim.indexOf(i) >= 0 ? 'shizi-cell is-out' : 'shizi-cell'
      return '<div class="' + cls + '">' + P().esc(ch) + '</div>'
    })
    return (
      '<div class="shizi-grid" style="grid-template-columns:repeat(' + lay.cols + ',' + mm(lay.w) + ')' +
      ';grid-auto-rows:' + mm(lay.h) +
      ';font-size:' + mm(lay.glyph) + '">' +
      cells.join('') +
      '</div>'
    )
  }

  /* 页眉：标题 + 「日期 姓名 用时 得分」一栏，与口算/奥数/数独共用零件 */
  function headHTML(title) {
    return (
      '<header class="sheet-head">' +
      '<h2 class="sheet-title">' + P().esc(title) + '</h2>' +
      P().metaHTML() +
      '</header>'
    )
  }

  function sheetHTML(chars, opts) {
    return (
      /* opts.font 来自 settings 的 oneOf 白名单，现在污染不了；
         但这是本文件唯一一处「靠调用方保证」的插值，包一层 esc 成本为零 */
      '<section class="sheet sheet-shizi" data-font="' + P().esc(opts.font) + '">' +
      headHTML(opts.title) +
      '<div class="shizi-stage">' + gridHTML(chars, opts.lay, opts.dim) + '</div>' +
      '<footer class="sheet-foot">' + P().esc(opts.foot) + '</footer>' +
      '</section>'
    )
  }

  /*
   * 整表核对：一屏一页，严格按原图的 15 列 × 12 行排，好和截图逐屏对照。
   * 超出复习范围（shizi.TOTAL 之后）的字印成灰色 —— 一眼能看出这一轮到底管到哪儿。
   */
  function renderProof(s) {
    var D = root.SumSum.shiziData
    var total = root.SumSum.shizi.poolSize()
    var lay = layout(D.COLS * D.ROWS, D.COLS)
    var html = []
    var offset = 0
    D.SCREENS.forEach(function (screen, si) {
      var chars = []
      screen.forEach(function (line) {
        Array.prototype.push.apply(chars, Array.from(line))
      })
      var dim = []
      chars.forEach(function (ch, i) {
        if (offset + i >= total) dim.push(i)
      })
      html.push(
        sheetHTML(chars, {
          title: '字表核对 · 第 ' + (si + 1) + ' 屏',
          lay: lay,
          dim: dim,
          font: s.font,
          foot:
            '第 ' + (offset + 1) + '–' + (offset + chars.length) + ' 字　·　' +
            D.COLS + ' 列 × ' + D.ROWS + ' 行，与原图同构' +
            (dim.length ? '　·　灰字为本轮未纳入复习的 ' + dim.length + ' 字' : '')
        })
      )
      offset += chars.length
    })
    return html
  }

  /* 主入口：把当前这一周（或整张字表）渲染成若干张练习纸 */
  function render(container, s) {
    var Z = root.SumSum.shizi
    var html

    if (s.proof) {
      html = renderProof(s)
    } else {
      var sl = Z.sliceOf(s.week, s.perWeek)
      var title = s.title || Z.titleFor(s)
      var per = perPageOf(s, sl.chars.length)
      /*
       * 后半截是纯兜底：面板能产生的每一种「每周字数 × 周次 × 每页字数」组合，
       * layout() 都有解（tools/check-shizi.js 把两万多种组合全跑了一遍，
       * 最小字号 6.6mm，仍在下限之上），所以这条分支现在走不到。
       * 留着是为了将来有人调 glyphMin 或放宽每页字数的上限时，不至于在这儿空指针。
       */
      var lay = layout(per) || layout(per, Math.ceil(Math.sqrt(per)))
      var pageTotal = Math.ceil(sl.chars.length / per)
      html = []
      for (var p = 0; p < pageTotal; p++) {
        var chunk = sl.chars.slice(p * per, (p + 1) * per)
        var foot =
          '第 ' + sl.week + ' 周 / 共 ' + sl.weeks + ' 周　·　第 ' +
          (sl.from + p * per) + '–' + (sl.from + p * per + chunk.length - 1) + ' 字' +
          (pageTotal > 1 ? '　·　第 ' + (p + 1) + ' 页 / 共 ' + pageTotal + ' 页' : '')
        /* 对战/双份在这一层做：同一页原样连印，两张内容完全一致。
           末页字少时仍用同一个 lay，否则末页的字会突然变大、像另一张卷子。 */
        for (var c = 1; c <= s.copies; c++) {
          html.push(
            sheetHTML(chunk, {
              title: title,
              lay: lay,
              font: s.font,
              foot: foot + (s.copies > 1 ? '　·　第 ' + c + ' 份' : '')
            })
          )
        }
      }
    }

    container.innerHTML = html.join('')
    /* 识字页固定 A4 纵向，不用像口算那样切 body.landscape */
    root.document.body.classList.remove('landscape')
  }

  root.SumSum = root.SumSum || {}
  root.SumSum.shiziRender = {
    render: render,
    MM: MM,
    layout: layout,
    autoPer: autoPer,
    perPageOf: perPageOf
  }
})(typeof window !== 'undefined' ? window : globalThis)
