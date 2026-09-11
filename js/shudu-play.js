/**
 * 在线作答层（轻量版）。
 *
 * 不另建一套视图：屏幕上渲染出来的就是真实的 .sheet，这里只给它加 .playable，
 * 把空格接管成可点击的格子。好处是「屏幕上玩的」和「打印出来的」永远是同一张纸，
 * 也不必维护两份渲染逻辑。打印时 css/shudu.css 的 @media print 会把作答态
 * 全部还原成干净题面，玩到一半也能随时打印。
 *
 * 交互：先点空格选中（同行/同列/同宫淡色高亮），再点底部数字条填入；
 * 再点同一个数字就擦除。填的过程中【不做任何对错判断】，点「提交批改」才判 ——
 * 填数独本来就是边填边改的，填完整盘还想回头调两格很正常，
 * 每填一格就弹「全部做对了」等于替人决定「你做完了」。改动任何一格，
 * 上一次的批改痕迹立刻作废（clearVerdict）。
 *
 * 作答状态只活在 DOM 里，不进 URL、不进 localStorage —— 链接的语义应当是
 * 「这张卷子」而不是「这张卷子做到一半的样子」，与口算/奥数的分享语义一致。
 */
(function (root) {
  'use strict'

  var doc = root.document
  var current = null // { sheet, board, q, n, sel }

  function $(id) {
    return doc.getElementById(id)
  }

  function cellsOf(boardEl) {
    return Array.prototype.slice.call(boardEl.querySelectorAll('.cell'))
  }

  /* 当前盘面的完整状态：题面提示 + 孩子填的，空格为 0 */
  function readGrid(boardEl) {
    return cellsOf(boardEl).map(function (el) {
      var v = parseInt(el.textContent, 10)
      return Number.isFinite(v) ? v : 0
    })
  }

  function clearMarks(boardEl, names) {
    cellsOf(boardEl).forEach(function (el) {
      names.forEach(function (nm) {
        el.classList.remove(nm)
      })
    })
  }

  /*
   * 清掉上一次交卷的批改痕迹。
   * 只要动了任何一格就要调一次 —— 上次的红叉和「全对」都已经不作数了，
   * 留在屏幕上会让人以为改完还是错的（或者已经对了）。
   */
  function clearVerdict(boardEl) {
    clearMarks(boardEl, ['bad'])
    boardEl.classList.remove('done')
  }

  /*
   * 交卷批改。
   *
   * 【为什么不在填的过程中实时判】：填数独本来就是边填边改的，填完整盘还想
   * 回头调两格很正常。每填一格就弹「全部做对了」，等于替人决定「你做完了」——
   * 人还没打算交卷。所以判分只发生在点「提交」的那一刻。
   *
   * 判的是「跟正确答案比对」而不是「有没有重复」：题目是唯一解，所以填错必然
   * 最终会撞车，但可能撞的那格还空着、当下看不出来。直接比答案，
   * 「哪几格错了」一次说清楚，不用等孩子把错误传染到别处。
   */
  function submit() {
    if (!current) return
    var boardEl = current.board
    var q = current.q
    var grid = readGrid(boardEl)
    var cells = cellsOf(boardEl)
    clearVerdict(boardEl)

    var blanks = 0
    var i
    for (i = 0; i < grid.length; i++) {
      if (!grid[i]) blanks++
    }
    if (blanks) {
      tip('还有 ' + blanks + ' 格没填，填完再交')
      return
    }

    var wrong = 0
    for (i = 0; i < grid.length; i++) {
      if (grid[i] !== q.solution[i]) {
        cells[i].classList.add('bad')
        wrong++
      }
    }
    if (wrong) {
      tip('有 ' + wrong + ' 格不对（已标红），改好再交一次')
      return
    }
    boardEl.classList.add('done')
    tip('🎉 全部做对了！', true)
  }

  function select(boardEl, idx) {
    var B = root.SumSum.shudu.board(current.q.shape)
    var cells = cellsOf(boardEl)
    clearMarks(boardEl, ['sel', 'peer'])
    if (idx == null) {
      current.sel = null
      return
    }
    current.sel = idx
    cells[idx].classList.add('sel')
    B.peers[idx].forEach(function (p) {
      cells[p].classList.add('peer')
    })
  }

  /* 底部数字条：1~n + 擦除 / 重来 / 提交 / 看答案 */
  function renderBar(n) {
    var bar = $('num-bar')
    var html = []
    for (var v = 1; v <= n; v++) {
      html.push('<button type="button" data-v="' + v + '">' + v + '</button>')
    }
    html.push('<button type="button" class="wide" data-act="erase">擦除</button>')
    html.push('<button type="button" class="wide" data-act="reset">重来</button>')
    /* 提交是主操作，给它实心样式，一眼能从一排按钮里认出来 */
    html.push('<button type="button" class="wide primary" data-act="submit">提交批改</button>')
    html.push('<button type="button" class="wide" data-act="reveal">看答案</button>')
    html.push('<span class="num-tip" id="num-tip">先点一个空格，再点数字；填完点「提交批改」</span>')
    bar.innerHTML = html.join('')
    bar.hidden = false
  }

  /*
   * 数字条是 fixed 的，会盖住预览区最底下那张纸，所以要给预览垫出等高的留白。
   * 必须实测而不能写死：四宫格在桌面上只有一行约 90px，九宫格在 375px 手机上
   * 9 个数字键会折成三行、高到 214px，写死一个数总有一头不对。
   * 窗口变窄变宽时折行数会变，所以 resize 也要重算（见 bind）。
   */
  function padForBar() {
    var bar = $('num-bar')
    var wrap = $('preview-wrap')
    if (!wrap) return
    if (!bar || bar.hidden) {
      wrap.style.paddingBottom = ''
      return
    }
    wrap.style.paddingBottom = bar.offsetHeight + 20 + 'px'
  }

  function tip(text, win) {
    var el = $('num-tip')
    if (!el) return
    el.textContent = text
    el.classList.toggle('win', !!win)
  }

  function put(v) {
    if (!current) return
    if (current.sel == null) {
      tip('先点一个空格，再点数字')
      return
    }
    var cell = cellsOf(current.board)[current.sel]
    var was = parseInt(cell.textContent, 10)
    /* 再点一次同一个数字 = 擦除，省一次点击 */
    if (Number.isFinite(was) && was === v) v = 0

    cell.textContent = v ? String(v) : ''
    cell.classList.toggle('mine', v !== 0)
    cell.classList.remove('revealed')

    /* 改了格子，上一次的批改结果就作废；这里不判对错，等点「提交」 */
    clearVerdict(current.board)
    var blanks = readGrid(current.board).filter(function (x) { return !x }).length
    tip(blanks ? '还有 ' + blanks + ' 格　·　填完点「提交」批改' : '填满了，点「提交」看对不对')
  }

  function reset() {
    if (!current) return
    cellsOf(current.board).forEach(function (el, i) {
      if (current.q.puzzle[i] !== 0) return
      el.textContent = ''
      el.classList.remove('mine', 'revealed')
    })
    select(current.board, null)
    clearVerdict(current.board)
    tip('已清空，重新开始')
  }

  function reveal() {
    if (!current) return
    cellsOf(current.board).forEach(function (el, i) {
      if (current.q.puzzle[i] !== 0) return
      el.textContent = String(current.q.solution[i])
      el.classList.remove('mine')
      el.classList.add('revealed')
    })
    select(current.board, null)
    clearVerdict(current.board)
    tip('这是答案。想自己做的话点「重来」')
  }

  /*
   * 接管预览区里的第一张题目纸。
   * 只接管第一张：一屏只玩一道题，孩子不会在十几张纸之间跳来跳去；
   * 其余几张仍然照常显示，打印出来是完整的一叠。
   */
  function attach(container, s, puzzles) {
    var bar = $('num-bar')
    current = null
    /* .playing 让 .preview 垫出底部留白，给固定定位的数字条腾地方 */
    doc.body.classList.remove('playing')
    if (bar) {
      bar.hidden = true
      bar.innerHTML = ''
    }
    if (!s.playMode || !puzzles.length) {
      padForBar()
      return
    }

    var sheet = container.querySelector('.sheet-sudoku')
    var boardEl = sheet && sheet.querySelector('.sudoku')
    if (!boardEl) return
    doc.body.classList.add('playing')

    sheet.classList.add('playable')
    var n = root.SumSum.shudu.shapeOf(puzzles[0].shape).n
    current = { sheet: sheet, board: boardEl, q: puzzles[0], n: n, sel: null }
    renderBar(n)
    tip(puzzles.length > 1
      ? '先点一个空格，再点数字（在线只玩第 1 题，打印是全部 ' + puzzles.length + ' 题）'
      : '先点一个空格，再点数字')
    padForBar()
  }

  /* 事件委托绑一次就够：预览区和数字条的内容会反复重渲染，但容器本身不换 */
  function bind() {
    var wrap = $('preview')
    var bar = $('num-bar')

    wrap.addEventListener('click', function (e) {
      if (!current) return
      var cell = e.target.closest ? e.target.closest('.cell.blank') : null
      if (!cell || !current.board.contains(cell)) return
      select(current.board, cellsOf(current.board).indexOf(cell))
    })

    /* 键盘：选中格后直接敲数字，退格擦除（大人自己玩的时候快得多） */
    wrap.addEventListener('keydown', function (e) {
      if (!current || current.sel == null) return
      if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') {
        e.preventDefault()
        return put(0)
      }
      /* 回车 = 交卷，省得每次都去够底下那颗按钮 */
      if (e.key === 'Enter') {
        e.preventDefault()
        return submit()
      }
      var v = parseInt(e.key, 10)
      if (Number.isFinite(v) && v >= 1 && v <= current.n) {
        e.preventDefault()
        put(v)
      }
    })

    bar.addEventListener('click', function (e) {
      var btn = e.target.closest ? e.target.closest('button') : null
      if (!btn) return
      var act = btn.getAttribute('data-act')
      if (act === 'erase') return put(0)
      if (act === 'reset') return reset()
      if (act === 'submit') return submit()
      if (act === 'reveal') return reveal()
      var v = parseInt(btn.getAttribute('data-v'), 10)
      if (Number.isFinite(v)) put(v)
    })

    /* 窗口变窄时数字条会多折一行，垫的留白得跟着变 */
    root.addEventListener('resize', padForBar)
  }

  root.SumSum = root.SumSum || {}
  root.SumSum.shuduPlay = {
    bind: bind,
    attach: attach
  }
})(typeof window !== 'undefined' ? window : globalThis)
