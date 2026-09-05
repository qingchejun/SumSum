/**
 * 页面交互：表单 ↔ 设置对象双向同步、按模式显隐控件、预设按钮、
 * 重新生成 / 打印。任何参数变化都会自动重新生成并渲染（所见即所得）。
 */
(function (root) {
  'use strict'

  var doc = root.document
  var S = root.SumSum

  function $(id) {
    return doc.getElementById(id)
  }

  var els = {
    mode: $('f-mode'),
    min: $('f-min'),
    max: $('f-max'),
    mulmin: $('f-mulmin'),
    mulmax: $('f-mulmax'),
    carry: $('f-carry'),
    count: $('f-count'),
    columns: $('f-columns'),
    blank: $('f-blank'),
    paper: $('f-paper'),
    nonneg: $('f-nonneg'),
    exactdiv: $('f-exactdiv'),
    parens: $('f-parens'),
    nodup: $('f-nodup'),
    anspage: $('f-anspage'),
    title: $('f-title')
  }

  var settings = S.settings.load()

  function fillForm(s) {
    els.mode.value = s.mode
    els.min.value = s.min
    els.max.value = s.max
    els.mulmin.value = s.mulMin
    els.mulmax.value = s.mulMax
    els.carry.value = s.carryMode
    els.count.value = s.count
    els.columns.value = String(s.columns)
    els.blank.value = s.blankMode
    els.paper.value = s.paper
    els.nonneg.checked = !s.allowNegative // 勾选「不出负数」= 不允许负数
    els.exactdiv.checked = s.exactDivision
    els.parens.checked = s.parens
    els.nodup.checked = s.noDuplicates
    els.anspage.checked = s.answerPage
    els.title.value = s.title
  }

  function readForm() {
    return S.settings.sanitize({
      mode: els.mode.value,
      min: els.min.value,
      max: els.max.value,
      mulMin: els.mulmin.value,
      mulMax: els.mulmax.value,
      carryMode: els.carry.value,
      count: els.count.value,
      columns: els.columns.value,
      blankMode: els.blank.value,
      paper: els.paper.value,
      allowNegative: !els.nonneg.checked,
      exactDivision: els.exactdiv.checked,
      parens: els.parens.checked,
      noDuplicates: els.nodup.checked,
      answerPage: els.anspage.checked,
      title: els.title.value.trim()
    })
  }

  /* 按当前模式显隐相关控件（HTML 中用 data-show / data-show-inline 标注适用模式） */
  function updateVisibility(mode) {
    var nodes = doc.querySelectorAll('[data-show], [data-show-inline]')
    Array.prototype.forEach.call(nodes, function (el) {
      var attr = el.getAttribute('data-show') || el.getAttribute('data-show-inline')
      el.hidden = attr.split(' ').indexOf(mode) < 0
    })
  }

  /* 切换纸张方向时改写 @page 规则，打印方向随之变化 */
  function updatePageStyle(paper) {
    $('page-style').textContent = '@page { size: A4 ' + paper + '; margin: 15mm; }'
  }

  /* 窄屏时按容器宽度整体缩放预览（zoom 会影响布局尺寸；打印样式里会强制还原） */
  function fitPreview() {
    var wrap = $('preview-wrap')
    var sheet = doc.querySelector('.sheet')
    var preview = $('preview')
    if (!sheet || !preview) return
    var factor = Math.min(1, (wrap.clientWidth - 8) / sheet.offsetWidth)
    preview.style.zoom = factor < 1 ? String(factor) : ''
  }

  /* 主流程：保存设置 → 同步表单与显隐 → 生成题目 → 渲染练习纸 */
  function refresh() {
    S.settings.save(settings)
    fillForm(settings)
    updateVisibility(settings.mode)
    updatePageStyle(settings.paper)

    var result = S.generator.generate(settings)
    S.render.render($('preview'), settings, result.questions)
    fitPreview()

    var notice = $('notice')
    if (result.shortfall > 0) {
      notice.textContent =
        '当前参数下不重复的题目只有 ' + result.questions.length +
        ' 道（少于设定的 ' + settings.count +
        ' 道）。可以减少题量、扩大数值范围，或关闭「题目不重复」。'
      notice.hidden = false
    } else {
      notice.hidden = true
    }
  }

  function onFormChange() {
    settings = readForm()
    refresh()
  }

  Object.keys(els).forEach(function (k) {
    els[k].addEventListener('change', onFormChange)
  })

  /* 预设按钮：套用参数并清空自定义标题（标题改为自动生成） */
  S.settings.PRESETS.forEach(function (p) {
    var btn = doc.createElement('button')
    btn.type = 'button'
    btn.className = 'preset'
    btn.textContent = p.label
    btn.addEventListener('click', function () {
      settings = S.settings.sanitize(
        Object.assign({}, settings, p.patch, { title: '' })
      )
      refresh()
    })
    $('preset-row').appendChild(btn)
  })

  /* 重新生成：参数不变，换一批随机题 */
  $('btn-regen').addEventListener('click', refresh)

  $('btn-print').addEventListener('click', function () {
    root.print()
  })

  root.addEventListener('resize', fitPreview)

  /* 页面隔天未刷新直接打印（含浏览器菜单打印）时，日期仍保证是当天 */
  root.addEventListener('beforeprint', S.render.refreshDates)

  refresh()
})(window)
