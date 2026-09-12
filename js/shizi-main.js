/**
 * 识字页交互：模式切换、表单 ↔ 设置对象双向同步、周次前进后退、打印。
 * 与其它三个板块一致 —— 任何参数变化都会自动重新渲染（所见即所得），没有「生成」按钮。
 * 这里连生成都算不上：字表是固定的，换一周只是换一段下标。
 *
 * 错字集的标记动作【不走这里】：它由 js/shizi-mark.js 直接改被点那一格的 class，
 * 绕开 refresh()。原因见那个文件的说明 —— 点一下就重渲染会让卷面在手指底下重新流动。
 */
(function (root) {
  'use strict'

  var doc = root.document
  var S = root.SumSum

  function $(id) {
    return doc.getElementById(id)
  }

  var els = {
    week: $('f-week'),
    perWeek: $('f-perweek'),
    perPage: $('f-perpage'),
    font: $('f-font'),
    copies: $('f-copies'),
    title: $('f-title')
  }

  var settings = S.shiziSettings.load()

  /* 错字集卷面渲染时用的那一份快照。渲染之后用户还会继续点，
     集合和卷面就会对不上 —— 用它判断要不要提示「重新排版」。 */
  var renderedWrong = []

  /* 当前卷面是不是已经和错字集对不上了（只在错字集模式下有意义） */
  function isStale() {
    if (settings.mode !== 'wrong') return false
    if (S.shiziMark.size() !== renderedWrong.length) return true
    return renderedWrong.some(function (ch) {
      return !S.shiziMark.has(ch)
    })
  }

  function fillTabs(s) {
    var tabs = $('mode-tabs').querySelectorAll('.stage-tab')
    for (var i = 0; i < tabs.length; i++) {
      tabs[i].classList.toggle('active', tabs[i].dataset.mode === s.mode)
    }
    /* 页签上直接带字数，不用切进去才知道攒了多少 */
    var n = S.shiziMark.size()
    $('wrong-n').textContent = n ? ' ' + n : ''
  }

  function fillForm(s) {
    /* 非「本周复习」模式下，周次与每周字数这两块控件不起作用，直接收起来。
       留着变灰只是噪音 —— 上面的页签已经说清楚现在在看哪张卷子。 */
    $('sec-progress').hidden = s.mode !== 'week'
    $('sec-range').hidden = s.mode !== 'week'
    /* 核对模式固定按原图 15×12 排、只印一份，这两个控件不起作用 */
    els.perPage.disabled = s.mode === 'proof'
    els.copies.disabled = s.mode === 'proof'
    /* 每周字数一改，总周数就变了，输入框的上限要跟着走，
       否则浏览器自带的上下箭头能点到一个会被钳掉的数，看着像没生效。 */
    els.week.max = String(S.shizi.totalWeeks(s.perWeek))
    els.week.value = String(s.week)
    els.perWeek.value = String(s.perWeek)
    els.perPage.value = String(s.perPage)
    els.font.value = s.font
    els.copies.value = String(s.copies)
    els.title.value = s.title
  }

  function readForm() {
    return S.shiziSettings.sanitize({
      week: els.week.value,
      perWeek: els.perWeek.value,
      perPage: els.perPage.value,
      font: els.font.value,
      copies: els.copies.value,
      mode: settings.mode, // 模式不是表单项，由页签管
      title: els.title.value.trim()
    })
  }

  /* 面板顶部那块进度：大号周次 + 字序区间 + 进度条 + 前后按钮的可用状态 */
  function fillProgress(s) {
    var sl = S.shizi.sliceOf(s.week, s.perWeek)
    $('week-now').textContent = '第 ' + sl.week + ' 周'
    $('week-sub').textContent =
      '第 ' + sl.from + '–' + sl.to + ' 字　·　共 ' + sl.weeks + ' 周　·　字表 ' +
      S.shizi.poolSize() + ' 字'
    $('week-fill').style.width = (sl.week / sl.weeks) * 100 + '%'
    $('btn-prev').disabled = sl.week <= 1
    $('btn-next').disabled = sl.week >= sl.weeks

    $('week-hint').textContent =
      sl.week >= sl.weeks
        ? '这是最后一周，一轮走完了。想再过一遍，把「第几周」填回 1 就行 —— 隔了三四个月再看，前面的字正好该复习了。'
        : '印完这一张，点「下一周」往前走。进度会记住，下次打开还在这儿。'
  }

  /*
   * 提前把「会印几张纸、字有多大」告诉用户。
   * 字的毫米数是这个板块最该说清楚的一件事 —— 一年级课本的生字大约 10mm，
   * 家长有这个参照才知道 7.8mm 是「有点小但能认」还是「太小了」。
   */
  function pagesHint(s, count) {
    if (s.mode === 'proof') {
      /* 核对模式不受「每页字数 / 份数」影响，页数是字表屏数定死的。
         不说一句的话，面板上那两个控件点了没反应，像是坏了。 */
      return '整表核对：固定 ' + S.shiziData.SCREENS.length + ' 页，每页 ' +
        S.shiziData.COLS * S.shiziData.ROWS + ' 字，不受上面的每页字数与份数影响。'
    }
    if (!count) return ''
    var per = S.shiziRender.perPageOf(s, count)
    var lay = S.shiziRender.layout(per)
    if (!lay) return '' // 与 shizi-render 同一条兜底：目前不可达，但别让面板先炸
    var sheets = Math.ceil(count / per)
    var text = '一共 ' + sheets * s.copies + ' 张纸：' + count + ' 个字'
    if (sheets > 1) text += ' · 每页 ' + per + ' 个 = ' + sheets + ' 页'
    if (s.copies > 1) text += ' × ' + s.copies + ' 份'
    return text + '。排成 ' + lay.cols + ' 列 × ' + lay.rows + ' 行，每个字约 ' +
      (Math.floor(lay.glyph * 10) / 10) + 'mm（课本生字约 10mm）。'
  }

  /*
   * 错字集那一块的说明。三种模式下点击的含义一致（切换集合成员），只是初始状态不同。
   * 返回的是 HTML，里面全是写死的文案，没有任何用户输入，可以直接进 innerHTML。
   */
  function markHint(s) {
    var n = S.shiziMark.size()
    if (!n) {
      /* 一个字都没有时，讲「怎么移出」是没意义的 —— 不管在哪个模式，
         此刻唯一有用的信息都是「去哪儿、怎么把第一个字收进来」。 */
      return '错字集还是空的。' +
        (s.mode === 'week' ? '孩子念不出来的字，在右边卷面上点一下就收进来了，'
          : '切到「本周复习」，孩子念不出来的字在卷面上点一下就收进来了，') +
        '<b>纸上不会印出任何标记。</b>'
    }
    var head = '错字集里有 <b>' + n + '</b> 个字。'
    if (s.mode === 'wrong') {
      return head + '点红底的字把它移出（孩子这次认出来了）。点掉的字先留在原位不重排 —— ' +
        '不然下一个字会跳到手指底下，很容易误点。'
    }
    if (s.mode === 'proof') {
      return head + '这一页也能点：看到孩子肯定不会的字，顺手点一下就收进错字集。'
    }
    return head + '孩子念不出来的字，在右边卷面上点一下就变红底，收进错字集。' +
      '可以边念边点，也可以先在纸上圈、事后对着纸点一遍。<b>纸上不会印出任何标记。</b>'
  }

  /* 按钮文案随模式走：印的是哪张卷子，按钮上就写哪张 */
  var PRINT_LABEL = { week: '🖨 打印复习卷', wrong: '🖨 打印错字卷', proof: '🖨 打印全表' }

  /* 主流程：保存设置 → 同步表单 → 渲染 → 把错字标记投影回新 DOM */
  function refresh() {
    S.shiziSettings.save(settings)
    fillTabs(settings)
    fillForm(settings)
    if (settings.mode === 'week') fillProgress(settings)

    /* 错字集模式下，渲染用的是【进入时的快照】；之后用户再点就只改 class，
       不动卷面结构，直到他自己点「重新排版」或切走再切回来。 */
    renderedWrong = settings.mode === 'wrong' ? S.shiziMark.all() : []
    S.shiziRender.render($('preview'), settings, renderedWrong)
    /* 渲染之后立刻把集合投影到新 DOM 上 —— 位置对应数独 render() 紧跟 attach() 的那两行 */
    S.shiziMark.paint()
    fitPreview()

    var count = settings.mode === 'wrong'
      ? renderedWrong.length
      : S.shizi.sliceOf(settings.week, settings.perWeek).chars.length
    $('pages-hint').textContent = pagesHint(settings, count)
    $('btn-print').textContent = PRINT_LABEL[settings.mode]
    $('btn-print').disabled = settings.mode === 'wrong' && !renderedWrong.length
    refreshMarkPanel()

    var notice = $('notice')
    if (settings.mode === 'wrong' && !renderedWrong.length) {
      notice.textContent =
        '错字集还是空的。切到「本周复习」，孩子念不出来的字在卷面上点一下，就会收到这里。'
      notice.hidden = false
    } else if (settings.mode === 'proof') {
      notice.textContent = '整表核对模式：这不是给孩子做的卷子，是用来和原字表截图逐屏对照的。'
      notice.hidden = false
    } else {
      notice.hidden = true
    }
  }

  /* 只刷错字集那一块 + 页签徽标。标记动作走这条路，不碰 #preview */
  function refreshMarkPanel() {
    fillTabs(settings)
    $('mark-hint').innerHTML = markHint(settings)
    var stale = isStale()
    var relayout = $('btn-relayout')
    relayout.hidden = !stale
    if (stale) {
      var gone = renderedWrong.filter(function (ch) {
        return !S.shiziMark.has(ch)
      }).length
      relayout.textContent = gone ? '重新排版（移出 ' + gone + ' 字）' : '重新排版'
    }
    $('btn-clear-wrong').disabled = !S.shiziMark.size()
  }

  /* 窄屏时按容器宽度整体缩放预览（打印样式里会强制还原成 1:1） */
  function fitPreview() {
    var wrap = $('preview-wrap')
    var sheet = doc.querySelector('.sheet')
    var preview = $('preview')
    if (!preview) return
    if (!sheet) {
      preview.style.zoom = ''
      return
    }
    var factor = Math.min(1, (wrap.clientWidth - 8) / sheet.offsetWidth)
    preview.style.zoom = factor < 1 ? String(factor) : ''
  }

  function onFormChange() {
    settings = readForm()
    refresh()
  }

  /* perWeek 单独绑（见下），不要进这个循环，否则改每周字数会走通用路径、把进度弄丢 */
  Object.keys(els).forEach(function (k) {
    if (k === 'perWeek') return
    els[k].addEventListener('change', onFormChange)
  })

  /*
   * 改每周字数 = 换单位，不是换进度：周次要跟着搬，人还停在同一个字上。
   * 换算在 shizi-core 的 remapWeek 里（连同为什么必须换算的理由）。
   * 与数独换盘型时用 remapClues 把难度等比搬过去是同一套道理，
   * 所以它也和 shape 一样单独绑、不走通用的 onFormChange。
   */
  els.perWeek.addEventListener('change', function () {
    var to = S.shiziSettings.sanitize({ perWeek: els.perWeek.value }).perWeek
    settings = S.shiziSettings.sanitize(
      Object.assign({}, settings, {
        perWeek: to,
        week: S.shizi.remapWeek(settings.week, settings.perWeek, to)
      })
    )
    refresh()
  })

  /*
   * 周次边打边跟，但【只更新面板上那块进度显示】，不回读表单、不重渲染。
   * 若在 input 里走 onFormChange，refresh → fillForm 会把值立刻写回输入框：
   * 用户按退格把 16 删空的瞬间就被回填成 1，这个框永远清不掉最后一位。
   * 数独的难度滑块在 input 里也只改标签文字，同一个理由。真正的重算交给 change。
   */
  els.week.addEventListener('input', function () {
    var v = Number(els.week.value)
    if (!Number.isFinite(v) || v < 1) return // 空串 / 半截输入先不动
    fillProgress(S.shiziSettings.sanitize(Object.assign({}, settings, { week: v })))
  })

  /* 模式页签 */
  $('mode-tabs').addEventListener('click', function (ev) {
    var tab = ev.target.closest ? ev.target.closest('.stage-tab') : null
    if (!tab || !tab.dataset.mode || tab.dataset.mode === settings.mode) return
    settings = S.shiziSettings.sanitize(
      Object.assign({}, settings, { mode: tab.dataset.mode })
    )
    refresh()
  })

  function step(delta) {
    return function () {
      settings = S.shiziSettings.sanitize(
        Object.assign({}, settings, { week: settings.week + delta })
      )
      refresh()
    }
  }

  $('btn-prev').addEventListener('click', step(-1))
  $('btn-next').addEventListener('click', step(1))

  /* 用户自己决定什么时候把点掉的字从卷面上清掉 */
  $('btn-relayout').addEventListener('click', refresh)

  $('btn-clear-wrong').addEventListener('click', function () {
    var n = S.shiziMark.size()
    if (!n) return
    /* 清空是不可逆的，而且攒了几个月的东西 —— 值得拦一道 */
    if (!root.confirm('清空错字集里的 ' + n + ' 个字？这一步撤不回来。')) return
    S.shiziMark.clear()
    refresh()
  })

  $('btn-print').addEventListener('click', function () {
    root.print()
  })

  root.addEventListener('resize', fitPreview)

  /* 页面隔天未刷新直接打印（含浏览器菜单打印）时，日期仍保证是当天 */
  root.addEventListener('beforeprint', S.render.refreshDates)

  /*
   * 标记变化时【只刷面板】，绝不重渲染卷面。
   * 这是这个功能好不好用的关键，理由见 js/shizi-mark.js 的文件头。
   */
  S.shiziMark.onChange(refreshMarkPanel)
  S.shiziMark.bind()
  refresh()
})(window)
