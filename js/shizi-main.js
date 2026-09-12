/**
 * 识字页交互：表单 ↔ 设置对象双向同步、周次前进后退、打印。
 * 与其它三个板块一致 —— 任何参数变化都会自动重新渲染（所见即所得），没有「生成」按钮。
 * 这里连生成都算不上：字表是固定的，换一周只是换一段下标。
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
    proof: $('f-proof'),
    title: $('f-title')
  }

  var settings = S.shiziSettings.load()

  function fillForm(s) {
    /* 核对模式下这两个控件不起作用（renderProof 固定按原图排、只印一份），
       置灰比让它们看着能点、点了又没反应要诚实 */
    els.perPage.disabled = s.proof
    els.copies.disabled = s.proof
    /* 每周字数一改，总周数就变了，输入框的上限要跟着走，
       否则浏览器自带的上下箭头能点到一个会被钳掉的数，看着像没生效。 */
    els.week.max = String(S.shizi.totalWeeks(s.perWeek))
    els.week.value = String(s.week)
    els.perWeek.value = String(s.perWeek)
    els.perPage.value = String(s.perPage)
    els.font.value = s.font
    els.copies.value = String(s.copies)
    els.proof.checked = s.proof
    els.title.value = s.title
  }

  function readForm() {
    return S.shiziSettings.sanitize({
      week: els.week.value,
      perWeek: els.perWeek.value,
      perPage: els.perPage.value,
      font: els.font.value,
      copies: els.copies.value,
      proof: els.proof.checked,
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
  function pagesHint(s) {
    if (s.proof) {
      /* 核对模式不受「每页字数 / 份数」影响，页数是字表屏数定死的。
         不说一句的话，面板上那两个控件点了没反应，像是坏了。 */
      return '整表核对：固定 ' + S.shiziData.SCREENS.length + ' 页，每页 ' +
        S.shiziData.COLS * S.shiziData.ROWS + ' 字，不受上面的每页字数与份数影响。'
    }
    var count = S.shizi.sliceOf(s.week, s.perWeek).chars.length
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

  /* 主流程：保存设置 → 同步表单 → 渲染 */
  function refresh() {
    S.shiziSettings.save(settings)
    fillForm(settings)
    fillProgress(settings)

    S.shiziRender.render($('preview'), settings)
    fitPreview()

    $('pages-hint').textContent = pagesHint(settings)
    $('proof-hint').textContent = settings.proof
      ? '现在印的是整张字表（' + S.shiziData.SCREENS.length + ' 页 × ' +
        S.shiziData.COLS * S.shiziData.ROWS + ' 字），行列与原字表一一对应，灰字是本轮没纳入复习的部分。核对完记得取消勾选。'
      : '字表是照着洪恩识字的截图一个个录进来的。勾上这个，会按原图的 15 列 × 12 行把整表印出来，可以逐屏对一遍有没有录错。'

    var notice = $('notice')
    if (settings.proof) {
      notice.textContent = '整表核对模式：这不是给孩子做的卷子，是用来和原字表截图逐屏对照的。'
      notice.hidden = false
    } else {
      notice.hidden = true
    }
  }

  /* 窄屏时按容器宽度整体缩放预览（打印样式里会强制还原成 1:1） */
  function fitPreview() {
    var wrap = $('preview-wrap')
    var sheet = doc.querySelector('.sheet')
    var preview = $('preview')
    if (!sheet || !preview) return
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

  $('btn-print').addEventListener('click', function () {
    root.print()
  })

  root.addEventListener('resize', fitPreview)

  /* 页面隔天未刷新直接打印（含浏览器菜单打印）时，日期仍保证是当天 */
  root.addEventListener('beforeprint', S.render.refreshDates)

  refresh()
})(window)
