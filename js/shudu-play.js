/**
 * 在线作答层。
 *
 * 不另建一套视图：屏幕上渲染出来的就是真实的 .sheet，这里只给它加 .playable，
 * 把格子接管成可点击的。好处是「屏幕上玩的」和「打印出来的」永远是同一张纸，
 * 也不必维护两份渲染逻辑。打印时 css/shudu.css 的 @media print 会把作答态
 * 全部还原成干净题面，玩到一半也能随时打印。
 *
 * 【状态与 DOM 的关系】作答状态放在 current 这个显式对象里，DOM 只是它的投影：
 * 所有操作都只改状态，然后调一次 paint() 全量重刷。n² ≤ 81，全量重刷毫无压力，
 * 却省掉了一整类「增量更新漏改某个 class」的 bug。
 *
 * 【两种反馈严格分开】
 *   .dup（黄）= 规则检查：同一行/列/宫出现了两个一样的数，填的当场就标。
 *               这是孩子自己也能看出来的事，只说「重复了」。
 *   .bad（红）= 答案检查：只在点「提交批改」之后才出现，说「不对」。
 * 填的过程中绝不判对错 —— 填数独本来就边填边改，整盘填完还想回头调两格很正常。
 *
 * 【一页多题时】第一页上的每个盘都能玩，各有各的一份状态（sessions），
 * current 指着当前操作的那一个。数字条、计时、撤销栈永远只对 current 生效 ——
 * 一条底栏管四个盘会让人不知道按钮作用在谁身上，所以当前盘要用 .active 框出来。
 * 点另一个盘上的任意格子就切过去。只接管第一页：其余几页照常显示、照常打印。
 *
 * 作答状态只活在内存里，不进 URL、不进 localStorage —— 链接的语义应当是
 * 「这张卷子」而不是「这张卷子做到一半的样子」，与口算/奥数的分享语义一致。
 */
(function (root) {
  'use strict'

  var doc = root.document
  var SD = null // 延迟取 root.SumSum.shudu，保证加载顺序无关
  var sessions = [] // 第一页上每个盘一份作答状态
  var current = null // sessions 里当前在操作的那一个
  var ticker = 0

  function $(id) {
    return doc.getElementById(id)
  }

  function core() {
    if (!SD) SD = root.SumSum.shudu
    return SD
  }

  function cellsOf(boardEl) {
    return Array.prototype.slice.call(boardEl.querySelectorAll('.cell'))
  }

  /* 盘面当前的完整数值：题面的提示 + 孩子填的。不传就是当前这一盘 */
  function gridOf(st) {
    st = st || current
    var q = st.q
    return st.fill.map(function (v, i) {
      return q.puzzle[i] || v
    })
  }

  function zeros(len) {
    var a = []
    for (var i = 0; i < len; i++) a.push(0)
    return a
  }

  /* ---------- 计时 ---------- */

  /*
   * 第一次落子才开始计时，不是页面加载就开始 —— 孩子常常先盯着盘看一会儿，
   * 那段时间算进成绩不合理。全对交卷后停表。
   */
  function startClock() {
    if (!current || current.startedAt) return
    current.startedAt = Date.now()
  }

  function elapsedMs() {
    if (!current || !current.startedAt) return 0
    return (current.stoppedAt || Date.now()) - current.startedAt
  }

  function clockText() {
    var s = Math.floor(elapsedMs() / 1000)
    var m = Math.floor(s / 60)
    return m + ':' + (s % 60 < 10 ? '0' : '') + (s % 60)
  }

  function spellTime() {
    var s = Math.floor(elapsedMs() / 1000)
    var m = Math.floor(s / 60)
    return m ? m + ' 分 ' + (s % 60) + ' 秒' : s + ' 秒'
  }

  function paintClock() {
    var el = $('play-clock')
    if (el) el.textContent = current && current.startedAt ? '⏱ ' + clockText() : '⏱ 0:00'
  }

  /* ---------- 冲突与计数 ---------- */

  /*
   * 重复检查：某格的值在它的行/列/宫里又出现了一次。
   * 用 shudu-core 预计算的 peers 表，「同宫」的定义和出题时是同一套，
   * 不会出现界面和生成器对规则的理解不一致。
   */
  function dupSet(st, grid) {
    var B = st.B
    var bad = {}
    for (var i = 0; i < grid.length; i++) {
      if (!grid[i]) continue
      var ps = B.peers[i]
      for (var k = 0; k < ps.length; k++) {
        if (grid[ps[k]] === grid[i]) {
          bad[i] = 1
          bad[ps[k]] = 1
        }
      }
    }
    return bad
  }

  /* 每个数字还差几个没填（数字条上的角标） */
  function remaining(st, grid) {
    var left = {}
    var v
    for (v = 1; v <= st.n; v++) left[v] = st.n
    for (var i = 0; i < grid.length; i++) {
      if (grid[i]) left[grid[i]]--
    }
    return left
  }

  /* ---------- 渲染 ---------- */

  /*
   * 唯一写 DOM 的地方。class 的叠加顺序在 css/shudu.css 里有一张优先级表，
   * 那边靠源码顺序决定谁盖谁，这里只管把该打的都打上。
   *
   * 选中格、同行同列（.sel/.peer）和荧光笔（.same/.scan）只画在当前这一盘上：
   * 四个盘是四道互不相干的题，在别的盘上高亮「所有的 3」毫无意义，反而吵。
   * 已填的数字、重复（黄）、错（红）则每个盘都各自照常显示。
   */
  function paintBoard(st) {
    var q = st.q
    var n = st.n
    var live = st === current
    var grid = gridOf(st)
    var cells = cellsOf(st.board)
    var dups = st.showDup ? dupSet(st, grid) : {}
    var hi = live ? st.hi : null

    /* 高亮数字所在的行、列 —— 没被染色的空格就是「这个数字还能放的地方」 */
    var scanRow = {}
    var scanCol = {}
    if (hi) {
      for (var z = 0; z < grid.length; z++) {
        if (grid[z] === hi) {
          scanRow[Math.floor(z / n)] = 1
          scanCol[z % n] = 1
        }
      }
    }

    for (var i = 0; i < cells.length; i++) {
      var el = cells[i]
      var mine = q.puzzle[i] === 0 && st.fill[i] !== 0
      var val = grid[i]

      el.textContent = val ? String(val) : ''
      el.classList.toggle('mine', mine && !st.revealed[i])
      el.classList.toggle('revealed', mine && !!st.revealed[i])

      el.classList.toggle('scan', !!hi && (scanRow[Math.floor(i / n)] === 1 || scanCol[i % n] === 1))
      el.classList.toggle('peer', live && st.sel != null && st.B.peers[st.sel].indexOf(i) >= 0)
      el.classList.toggle('same', !!hi && val === hi)
      el.classList.toggle('sel', live && st.sel === i)
      el.classList.toggle('dup', !!dups[i])
      el.classList.toggle('bad', !!st.wrong[i])
    }
    st.board.classList.toggle('done', st.verdict === 'done')
    /* 只有一个盘时不用标「当前」——没得选，框出来只是噪音 */
    st.board.classList.toggle('active', live && sessions.length > 1)
    if (st.item) st.item.classList.toggle('idle', !live && sessions.length > 1)
  }

  /* 全量重刷所有盘 + 底栏。最多 4 个盘 × 81 格，重刷一遍毫无压力 */
  function paint() {
    if (!current) return
    sessions.forEach(paintBoard)
    paintBar(gridOf())
    paintClock()
  }

  /* ---------- 数字条 ---------- */

  /*
   * 九宫格上按钮多达 16 个，375px 手机放不下一行，所以分三组：
   * 数字一行（可折行）、常用操作一行、计时+提示条+次要操作一行。
   * 高度变化由 padForBar() 实测后垫给预览区，这里不用关心。
   */
  function renderBar(n) {
    var bar = $('num-bar')
    var html = []
    var v

    html.push('<div class="bar-nums">')
    for (v = 1; v <= n; v++) {
      html.push(
        '<button type="button" data-v="' + v + '">' + v +
        '<span class="left" data-left="' + v + '"></span></button>'
      )
    }
    html.push('</div>')

    html.push('<div class="bar-acts">')
    html.push('<button type="button" class="wide" data-act="erase">擦除</button>')
    html.push('<button type="button" class="wide" data-act="undo">↶ 撤销</button>')
    html.push('<button type="button" class="wide" data-act="redo">↷ 重做</button>')
    html.push('<button type="button" class="wide" data-act="hint">💡 提示</button>')
    /* 提交是主操作，给它实心样式，一眼能从一排按钮里认出来 */
    html.push('<button type="button" class="wide primary" data-act="submit">提交批改</button>')
    html.push('</div>')

    html.push('<div class="bar-foot">')
    html.push('<span class="clock" id="play-clock">⏱ 0:00</span>')
    html.push('<span class="num-tip" id="num-tip"></span>')
    html.push('<span class="bar-links">')
    html.push('<button type="button" class="link" data-act="reset">重来</button>')
    html.push('<button type="button" class="link" data-act="reveal">看答案</button>')
    html.push('</span>')
    html.push('</div>')

    bar.innerHTML = html.join('')
    bar.hidden = false
  }

  function paintBar(grid) {
    var bar = $('num-bar')
    if (!bar || bar.hidden) return
    var left = remaining(current, grid)

    Array.prototype.forEach.call(bar.querySelectorAll('button[data-v]'), function (btn) {
      var v = parseInt(btn.getAttribute('data-v'), 10)
      var tag = btn.querySelector('.left')
      if (tag) tag.textContent = left[v] > 0 ? String(left[v]) : '✓'
      /* 填满的数字没什么可点了，变灰；但仍允许点它来高亮（看看都放哪儿了） */
      btn.classList.toggle('used', left[v] <= 0)
      btn.classList.toggle('lit', current.hi === v)
    })

    var undo = bar.querySelector('[data-act="undo"]')
    var redo = bar.querySelector('[data-act="redo"]')
    if (undo) undo.disabled = !current.past.length
    if (redo) redo.disabled = !current.future.length
  }

  /*
   * 数字条是 fixed 的，会盖住预览区最底下那张纸，所以要给预览垫出等高的留白。
   * 必须实测而不能写死：四宫格在桌面上只有两行，九宫格在 375px 手机上
   * 数字键会折行、整条高得多，写死一个数总有一头不对。
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

  /* 一页多题时，底栏说的每一句话都要挂上题号，否则不知道在说哪一盘 */
  function whoPlain() {
    return sessions.length > 1 && current ? '第 ' + current.idx + ' 题' : ''
  }

  function who() {
    var w = whoPlain()
    return w ? w + ' · ' : ''
  }

  /* 没在批改态时，提示条显示还剩多少格 */
  function idleTip() {
    var blanks = gridOf().filter(function (x) { return !x }).length
    tip(who() + (blanks ? '还有 ' + blanks + ' 格' : '填满了，点「提交批改」'))
  }

  /*
   * 刚落的这一子撞车了就直接说撞在哪条线上（「这一行已经有 3 了」）。
   * 措辞上只陈述【重复】这个事实，绝不说「你填错了」—— 重复是规则冲突，
   * 孩子自己也看得出来；对错要等交卷才判。这两种反馈的颜色（黄/红）
   * 和文案都必须分得开，见 css/shudu.css 的状态优先级表。
   */
  function dupTip(i) {
    var grid = gridOf()
    var v = grid[i]
    if (!v) return false
    var n = current.n
    var sp = core().shapeOf(current.q.shape)
    var r = Math.floor(i / n)
    var c = i % n
    var where = []
    var k
    var j

    for (k = 0; k < n; k++) {
      j = r * n + k
      if (j !== i && grid[j] === v) { where.push('这一行'); break }
    }
    for (k = 0; k < n; k++) {
      j = k * n + c
      if (j !== i && grid[j] === v) { where.push('这一列'); break }
    }
    if (sp.bh) {
      var br = Math.floor(r / sp.bh) * sp.bh
      var bc = Math.floor(c / sp.bw) * sp.bw
      var hit = false
      for (var a = 0; a < sp.bh && !hit; a++) {
        for (var b = 0; b < sp.bw && !hit; b++) {
          j = (br + a) * n + bc + b
          if (j !== i && grid[j] === v) hit = true
        }
      }
      if (hit) where.push('这一宫')
    }
    if (!where.length) return false
    tip(who() + where.join('、') + '已经有 ' + v + ' 了')
    return true
  }

  /* ---------- 改动盘面 ---------- */

  /*
   * 所有对 fill 的修改都走这里，统一记历史、作废上次批改结果。
   * 一步 = 一格的一次值变化。「重来」「看答案」会一次推入多步（见 pushBatch）。
   */
  function applyMoves(moves, redoable) {
    if (!moves.length) return
    moves.forEach(function (m) {
      current.fill[m.i] = m.to
      if (m.to === 0) delete current.revealed[m.i]
      else if (m.reveal) current.revealed[m.i] = 1
      else delete current.revealed[m.i]
    })
    if (redoable !== false) {
      current.past.push(moves)
      current.future.length = 0
    }
    /* 动了任何一格，上次的批改结果就不作数了 —— 红叉留在屏幕上会让人
       以为改完还是错的。「对错」永远只在下一次提交时重新判。 */
    current.wrong = {}
    current.verdict = null
  }

  /*
   * 落子。
   *
   * 【落完就取消选中】——这条是数字条能同时当「填数键」和「荧光笔」的关键。
   * 如果填完还留着选中态，接下来想点数字条高亮某个数，就会变成往那一格
   * 覆盖一个数（实测踩过：填完点「4」想看全盘的 4，结果把 4 填进了刚才那格，
   * 当场造出一行两个 4）。取消选中后，数字条的默认含义回到「高亮」，
   * 要填数就得先点格子——语义每一步都明确。
   *
   * 擦除/退格仍然能作用到刚填的那一格：记一个 lastEdit 兜着。
   */
  function put(v) {
    if (!current) return
    var i = current.sel
    /* 擦除时若已没有选中格，就作用于刚才编辑过的那一格 */
    if (i == null && v === 0) i = current.lastEdit
    if (i == null) {
      tip('先点一个空格，再点数字')
      return
    }
    if (current.q.puzzle[i] !== 0) {
      tip('这一格是题目印好的，改不了')
      return
    }
    var was = current.fill[i]
    /* 再点一次同一个数字 = 擦除，省一次点击 */
    if (was === v) v = 0
    if (was === v) return
    startClock()
    applyMoves([{ i: i, from: was, to: v }])
    current.lastEdit = v ? i : null
    current.sel = null
    /* 顺手把刚落的这个数高亮起来，正好能看清它在全盘的分布 */
    current.hi = v || null
    paint()
    if (!dupTip(i)) idleTip()
  }

  function undo() {
    if (!current || !current.past.length) return
    var moves = current.past.pop()
    moves.forEach(function (m) {
      current.fill[m.i] = m.from
      if (m.from === 0) delete current.revealed[m.i]
      else if (m.fromReveal) current.revealed[m.i] = 1
      else delete current.revealed[m.i]
    })
    current.future.push(moves)
    current.wrong = {}
    current.verdict = null
    paint()
    idleTip()
  }

  function redo() {
    if (!current || !current.future.length) return
    var moves = current.future.pop()
    applyMoves(moves, false)
    current.past.push(moves)
    paint()
    idleTip()
  }

  function reset() {
    if (!current) return
    var moves = []
    current.fill.forEach(function (v, i) {
      if (v) moves.push({ i: i, from: v, to: 0, fromReveal: !!current.revealed[i] })
    })
    applyMoves(moves)
    current.sel = null
    current.lastEdit = null
    paint()
    tip(who() + '已清空，重新开始')
  }

  function reveal() {
    if (!current) return
    var moves = []
    current.fill.forEach(function (v, i) {
      if (current.q.puzzle[i] !== 0) return
      if (v !== current.q.solution[i] || !current.revealed[i]) {
        moves.push({ i: i, from: v, to: current.q.solution[i], reveal: true, fromReveal: !!current.revealed[i] })
      }
    })
    applyMoves(moves)
    current.sel = null
    paint()
    tip(who() + '这是答案。想自己做的话点「重来」')
  }

  /* ---------- 高亮 ---------- */

  /* 点同一个数字第二次 = 关掉荧光笔 */
  function highlight(v) {
    if (!current) return
    current.hi = current.hi === v ? null : v
    paint()
  }

  function select(i) {
    if (!current) return
    current.sel = i
    /* 停在已填的格子上时顺手把这个数字高亮起来 —— 鼠标点已填格、
       方向键走到已填格，行为一致。 */
    var val = i == null ? 0 : gridOf()[i]
    if (val) current.hi = val
    paint()
  }

  /* ---------- 提示 ---------- */

  /*
   * 因为出题时保证了「只用唯一候选数就能推到底」，任何时刻都存在一个格子，
   * 它的行/列/宫已经出现了除一个数以外的全部数字。所以提示永远能给出
   * 人话理由，而不是干巴巴替人填个数。
   *
   * 【必须在「题面 + 孩子填对的那些格」这张干净盘上算，不能用当前盘面】：
   * 孩子填错的数字会把候选集搞矛盾，实测直接用当前盘面时四宫格 400 局里
   * 有 4 局找不到可提示的格子；换成干净盘后 1800 局零失败。
   * 道理也是可证的 —— 往盘上加正确的数只会让候选集更小，可解性单调保持。
   */
  function cleanGrid() {
    var q = current.q
    return q.puzzle.map(function (p, i) {
      if (p) return p
      return current.fill[i] === q.solution[i] ? current.fill[i] : 0
    })
  }

  function findHint() {
    var C = core()
    var B = current.B
    var n = current.n
    var clean = cleanGrid()
    var best = null

    for (var i = 0; i < clean.length; i++) {
      if (clean[i]) continue
      var cs = C.candidates(B, clean, i)
      if (cs.length !== 1) continue

      var r = Math.floor(i / n)
      var c = i % n
      var row = {}
      var col = {}
      var box = {}
      var ps = B.peers[i]
      for (var k = 0; k < ps.length; k++) {
        var p = ps[k]
        var v = clean[p]
        if (!v) continue
        if (Math.floor(p / n) === r) row[v] = 1
        else if (p % n === c) col[v] = 1
        else box[v] = 1
      }
      /* 按 行→列→宫 去重：同一个数字在行和列里各出现一次，只说一次就够。
         实测九宫格的理由从中位 51 字压到 44 字、最长 59 压到 49。 */
      Object.keys(row).forEach(function (d) { delete col[d]; delete box[d] })
      Object.keys(col).forEach(function (d) { delete box[d] })

      var nr = Object.keys(row).length
      var nc = Object.keys(col).length
      var nb = Object.keys(box).length
      /* 「好讲」的标准：用到的 unit 种类越少越好（只看一行就能定的最好讲），
         其次要列出的数字越少越好。另外优先挑当前还空着的格子 —— 实测
         1800 局里只有 0.2% 的情况只剩「填错的格」可指，那时指出来正好是纠错。 */
      var empty = current.fill[i] === 0
      var score = (empty ? 0 : 10000) + ((nr ? 1 : 0) + (nc ? 1 : 0) + (nb ? 1 : 0)) * 100 + nr + nc + nb
      if (!best || score < best.score) {
        best = { i: i, v: cs[0], row: row, col: col, box: box, score: score, r: r + 1, c: c + 1 }
      }
    }
    return best
  }

  function listOf(o) {
    return Object.keys(o).map(Number).sort(function (a, b) { return a - b }).join('、')
  }

  function hint() {
    if (!current) return
    var h = findHint()
    if (!h) {
      tip(who() + '这一盘已经填满了')
      return
    }
    startClock()
    var parts = []
    if (Object.keys(h.row).length) parts.push('这一行有 ' + listOf(h.row))
    if (Object.keys(h.col).length) parts.push('这一列有 ' + listOf(h.col))
    if (Object.keys(h.box).length) parts.push('这一宫有 ' + listOf(h.box))

    applyMoves([{ i: h.i, from: current.fill[h.i], to: h.v, fromReveal: !!current.revealed[h.i] }])
    current.sel = h.i
    current.hi = h.v
    current.hinted++
    paint()
    tip(who() + '第 ' + h.r + ' 行第 ' + h.c + ' 格：' + parts.join('，') + ' → 只能填 ' + h.v)
  }

  /* ---------- 交卷 ---------- */

  /*
   * 判的是「跟正确答案比对」而不是「有没有重复」：题目是唯一解，填错必然
   * 最终会撞车，但可能撞的那格还空着、当下看不出来。直接比答案，
   * 「哪几格错了」一次说清楚，不用等孩子把错误传染到别处。
   */
  function submit() {
    if (!current) return
    var grid = gridOf()
    var q = current.q
    current.wrong = {}
    current.verdict = null

    var blanks = grid.filter(function (x) { return !x }).length
    if (blanks) {
      paint()
      tip(who() + '还有 ' + blanks + ' 格没填，填完再交')
      return
    }

    var wrong = 0
    for (var i = 0; i < grid.length; i++) {
      if (grid[i] !== q.solution[i]) {
        current.wrong[i] = 1
        wrong++
      }
    }
    if (wrong) {
      current.verdict = 'wrong'
      paint()
      tip(who() + '有 ' + wrong + ' 格不对（已标红），改好再交一次')
      return
    }
    current.verdict = 'done'
    current.stoppedAt = Date.now()
    paint()
    /* 一页多题时顺手指一下还剩哪几道，省得孩子对着做完的那盘发呆 */
    var rest = sessions.filter(function (st) { return st.verdict !== 'done' }).length
    tip('🎉 ' + whoPlain() + '全部做对了！用时 ' + spellTime() +
      (current.hinted ? '（用了 ' + current.hinted + ' 次提示）' : '') +
      (rest ? '　还有 ' + rest + ' 道，点它就能接着做' : ''), true)
  }

  /* ---------- 挂载 ---------- */

  /*
   * 接管预览区里的第一张题目纸。
   * 只接管第一张：一页上的几道题都能玩已经够一次做的了，孩子不会在十几张纸
   * 之间跳来跳去；其余几张仍然照常显示，打印出来是完整的一叠。
   * 对战双份时第二张是同一道题的副本，更不该也能玩（两边分别记进度就乱了）。
   */
  function makeSession(q, boardEl, idx) {
    return {
      board: boardEl,
      /* .sudoku-item 用来打 .idle（压暗非当前盘）。认准 class 而不是直接拿
         parentNode —— 万一将来渲染层多包一层，误把整个 .sudoku-grid 压暗
         会把四个盘一起弄灰，而这种错在屏幕上要盯一会儿才看得出来。 */
      item: boardEl.parentNode && boardEl.parentNode.classList.contains('sudoku-item')
        ? boardEl.parentNode : null,
      q: q,
      idx: idx,
      n: core().shapeOf(q.shape).n,
      B: core().board(q.shape),
      fill: zeros(q.puzzle.length),
      revealed: {},
      past: [],
      future: [],
      wrong: {},
      verdict: null,
      sel: null,
      lastEdit: null,
      hi: null,
      showDup: true,
      hinted: 0,
      startedAt: 0,
      stoppedAt: 0
    }
  }

  /* 把上一局同一道题的进度原样搬过来（见下方 attach 的说明） */
  var KEEP = ['fill', 'revealed', 'past', 'future', 'sel', 'lastEdit', 'hi',
    'hinted', 'startedAt', 'stoppedAt', 'wrong', 'verdict']

  function attach(container, s, puzzles) {
    var bar = $('num-bar')
    var prev = sessions
    var prevAt = prev.indexOf(current) // 重渲染后仍停在刚才那一盘
    sessions = []
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
    var boards = sheet ? Array.prototype.slice.call(sheet.querySelectorAll('.sudoku')) : []
    if (!boards.length) return
    doc.body.classList.add('playing')
    sheet.classList.add('playable')

    boards.forEach(function (boardEl, k) {
      if (k >= puzzles.length) return
      var st = makeSession(puzzles[k], boardEl, k + 1)
      /*
       * 同一道题只是因为改了无关设置（勾答案页、改份数…）而重渲染时，
       * 把进度原样搬过来。否则玩到一半勾一下「附答案页」整盘就白填了。
       * 按位置 + key 双重认人：一页多题时位置本身不够（换批题位置还在），
       * key 本身也不够（关掉「题目不重复」时两个位置可能是同一道题）。
       */
      if (prev[k] && prev[k].q && prev[k].q.key === st.q.key) {
        KEEP.forEach(function (f) { st[f] = prev[k][f] })
      }
      sessions.push(st)
    })
    if (!sessions.length) return
    /* 沿用上一局正在做的那一盘，位置还在就不要把人甩回第 1 题 */
    current = sessions[prevAt >= 0 && prevAt < sessions.length ? prevAt : 0]

    renderBar(current.n)
    paint()
    if (current.verdict !== 'done') {
      var more = puzzles.length - sessions.length
      tip(sessions.length > 1
        ? '这一页 ' + sessions.length + ' 道都能做，点哪一盘就做哪一盘' +
          (more ? '（后面 ' + more + ' 道只印不玩）' : '')
        : (more ? '点空格填数（在线只玩第 1 题，打印是全部 ' + puzzles.length + ' 题）'
          : '点空格填数；点已填的数字可以高亮同样的数'))
    }
    padForBar()
  }

  /* 事件委托绑一次就够：预览区和数字条的内容会反复重渲染，但容器本身不换 */
  function bind() {
    var wrap = $('preview')
    var bar = $('num-bar')

    wrap.addEventListener('click', function (e) {
      if (!current) return
      var cell = e.target.closest ? e.target.closest('.cell') : null
      if (!cell) return
      /* 点的是哪一盘？点到别的盘就先切过去（答案页的小图不在 sessions 里，直接落空） */
      var st = null
      for (var k = 0; k < sessions.length; k++) {
        if (sessions[k].board.contains(cell)) { st = sessions[k]; break }
      }
      if (!st) return
      if (st !== current) {
        /* 离开的那一盘把选中和荧光笔收掉，免得两个盘同时看着像「在做」 */
        current.sel = null
        current.hi = null
        current = st
        /* 数字条不用重建：一页上几个盘同属一个盘型，n 一样，按钮就一样，
           重建只会让底栏闪一下。paint() 会把角标刷成新盘的。 */
        idleTip()
      }
      var i = cellsOf(current.board).indexOf(cell)
      if (i < 0) return
      var val = gridOf()[i]
      /* 已填的格子不能改，点它就是「高亮这个数字」；空格才是选中待填。
         注意再点一次同一个已填数字要能关掉高亮，所以这里走 highlight()。 */
      if (current.q.puzzle[i] !== 0) {
        current.sel = null
        highlight(val)
        return
      }
      select(i)
    })

    bar.addEventListener('click', function (e) {
      var btn = e.target.closest ? e.target.closest('button') : null
      if (!btn || btn.disabled) return
      var act = btn.getAttribute('data-act')
      if (act === 'erase') return put(0)
      if (act === 'undo') return undo()
      if (act === 'redo') return redo()
      if (act === 'hint') return hint()
      if (act === 'submit') return submit()
      if (act === 'reset') return reset()
      if (act === 'reveal') return reveal()
      var v = parseInt(btn.getAttribute('data-v'), 10)
      if (!Number.isFinite(v)) return
      /* 数字键一键两用：选中了空格就填进去，没选中就当荧光笔用。
         这样「点数字高亮」和「点数字填数」不用各占一颗按钮。 */
      if (current && current.sel != null && current.q.puzzle[current.sel] === 0) put(v)
      else highlight(v)
    })

    /*
     * 键盘监听挂在 document 而不是 #preview：已填的格子是纯 div、不可聚焦，
     * 方向键一旦走到已填格，焦点就断了。挂 document 统一处理，
     * 但必须放过设置面板里的输入框，否则会抢走用户打字。
     */
    doc.addEventListener('keydown', function (e) {
      if (!current) return
      var t = e.target
      if (t && /^(INPUT|SELECT|TEXTAREA)$/.test(t.tagName)) return

      var mod = e.ctrlKey || e.metaKey
      if (mod && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault()
        return e.shiftKey ? redo() : undo()
      }
      if (mod && (e.key === 'y' || e.key === 'Y')) {
        e.preventDefault()
        return redo()
      }
      if (mod) return

      var n = current.n
      var DIRS = { ArrowUp: -n, ArrowDown: n, ArrowLeft: -1, ArrowRight: 1 }
      if (Object.prototype.hasOwnProperty.call(DIRS, e.key)) {
        e.preventDefault()
        var from = current.sel == null ? 0 : current.sel
        var r = Math.floor(from / n)
        var c = from % n
        if (e.key === 'ArrowUp') r = Math.max(0, r - 1)
        if (e.key === 'ArrowDown') r = Math.min(n - 1, r + 1)
        if (e.key === 'ArrowLeft') c = Math.max(0, c - 1)
        if (e.key === 'ArrowRight') c = Math.min(n - 1, c + 1)
        return select(r * n + c)
      }
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
      if (Number.isFinite(v) && v >= 1 && v <= n) {
        e.preventDefault()
        if (current.sel != null && current.q.puzzle[current.sel] === 0) put(v)
        else highlight(v)
      }
    })

    /* 窗口变窄时数字条会多折一行，垫的留白得跟着变 */
    root.addEventListener('resize', padForBar)

    /* 秒表：只在计时开始且未停表时刷新那一行文字，不重排整盘 */
    ticker = root.setInterval(function () {
      if (current && current.startedAt && !current.stoppedAt) paintClock()
    }, 1000)
  }

  root.SumSum = root.SumSum || {}
  root.SumSum.shuduPlay = {
    bind: bind,
    attach: attach,
    /* 供浏览器端验收脚本调用，页面本身不用 */
    _debug: function () { return current },
    _sessions: function () { return sessions }
  }
})(typeof window !== 'undefined' ? window : globalThis)
