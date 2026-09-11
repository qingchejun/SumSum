/**
 * 在线作答层（轻量版）。
 *
 * 不另建一套视图：屏幕上渲染出来的就是真实的 .sheet，这里只给它加 .playable，
 * 把空格接管成可点击的格子。好处是「屏幕上玩的」和「打印出来的」永远是同一张纸，
 * 也不必维护两份渲染逻辑。打印时 css/shudu.css 的 @media print 会把作答态
 * 全部还原成干净题面，玩到一半也能随时打印。
 *
 * 交互：先点空格选中（同行/同列/同宫淡色高亮），再点底部数字条填入；
 * 再点同一个数字就擦除。冲突的格子和撞上的那些格一起标红。
 * 填满且无冲突即完成。
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
   * 重算冲突并标红。用 shudu-core 预计算的 peers 表，
   * 这样「同宫」的判定和出题时用的是同一套定义，不会出现两边规则不一致。
   */
  function refreshConflicts(boardEl, q) {
    var B = root.SumSum.shudu.board(q.shape)
    var grid = readGrid(boardEl)
    var cells = cellsOf(boardEl)
    clearMarks(boardEl, ['bad', 'bad-peer'])

    var bad = false
    for (var i = 0; i < grid.length; i++) {
      if (!grid[i]) continue
      var ps = B.peers[i]
      for (var k = 0; k < ps.length; k++) {
        if (grid[ps[k]] === grid[i]) {
          /* 题面自带的提示不标红——错的是孩子填的那个，不是印上去的那个 */
          if (q.puzzle[i] === 0) cells[i].classList.add('bad')
          else cells[i].classList.add('bad-peer')
          bad = true
        }
      }
    }

    var filled = grid.every(function (v) { return v !== 0 })
    boardEl.classList.toggle('done', filled && !bad)
    return { filled: filled, bad: bad }
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

  /* 底部数字条：1~n + 擦除 + 重来 + 看答案 */
  function renderBar(n) {
    var bar = $('num-bar')
    var html = []
    for (var v = 1; v <= n; v++) {
      html.push('<button type="button" data-v="' + v + '">' + v + '</button>')
    }
    html.push('<button type="button" class="wide" data-act="erase">擦除</button>')
    html.push('<button type="button" class="wide" data-act="reset">重来</button>')
    html.push('<button type="button" class="wide" data-act="reveal">看答案</button>')
    html.push('<span class="num-tip" id="num-tip">先点一个空格，再点数字</span>')
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

    var st = refreshConflicts(current.board, current.q)
    if (st.filled && !st.bad) tip('🎉 全部做对了！', true)
    else if (st.bad) tip('标红的地方重复了，改一改')
    else tip('继续，还有空格')
  }

  function reset() {
    if (!current) return
    cellsOf(current.board).forEach(function (el, i) {
      if (current.q.puzzle[i] !== 0) return
      el.textContent = ''
      el.classList.remove('mine', 'revealed')
    })
    select(current.board, null)
    refreshConflicts(current.board, current.q)
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
    refreshConflicts(current.board, current.q)
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
        var cell = cellsOf(current.board)[current.sel]
        cell.textContent = ''
        cell.classList.remove('mine', 'revealed')
        refreshConflicts(current.board, current.q)
        return
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
