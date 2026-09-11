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
    skiptrivial: $('f-skiptrivial'),
    nodup: $('f-nodup'),
    anspage: $('f-anspage'),
    stephint: $('f-stephint'),
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
    els.skiptrivial.checked = s.skipTrivial
    els.nodup.checked = s.noDuplicates
    els.anspage.checked = s.answerPage
    els.stephint.checked = s.stepHint
    els.title.value = s.title
  }

  /*
   * sanitize 会把不可行的范围钳回可行域（如加法要求 2×min ≤ max），
   * 钳完的值又被 fillForm 写回输入框——用户看到数字自己变了却不知为何。
   * 这里记下这一次改写，refresh() 会在提示条里说明原因。
   */
  var rangeNote = ''
  var lastTouched = '' // 'min' / 'max'：用户刚改的那个值优先保住，调另一个

  function hasAdd(mode) {
    return mode === 'add' || mode === 'addsub' || mode === 'mixed'
  }

  /* 含加法的模式要求 2×min ≤ max，其余只要求 max > min */
  function neededMax(mode, min) {
    return hasAdd(mode) ? min * 2 : min + 1
  }

  function readForm() {
    var typedMin = Number(els.min.value)
    var typedMax = Number(els.max.value)
    var rawMax = els.max.value
    /*
     * 用户刚调大最小值时，别把它钳回去——那样他刚输入的数字会凭空消失，
     * 而且再去改最大值也救不回来。这里改为顺势把最大值抬到可行域。
     */
    if (
      lastTouched === 'min' &&
      Number.isFinite(typedMin) &&
      Number.isFinite(typedMax)
    ) {
      var need = neededMax(els.mode.value, typedMin)
      if (typedMax < need) rawMax = String(Math.min(10000, need))
    }
    var clean = S.settings.sanitize({
      mode: els.mode.value,
      min: els.min.value,
      max: rawMax,
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
      skipTrivial: els.skiptrivial.checked,
      noDuplicates: els.nodup.checked,
      answerPage: els.anspage.checked,
      stepHint: els.stephint.checked,
      seed: settings.seed, // 种子不是表单项，改参数时沿用，只有「重新生成」才换
      title: els.title.value.trim()
    })
    rangeNote = ''
    var why = hasAdd(els.mode.value)
      ? '加法要求两个加数都不小于最小值、和又不超过最大值，所以最小值最多是最大值的一半'
      : '最大值必须大于最小值'
    if (Number.isFinite(typedMin) && Number.isFinite(typedMax)) {
      if (clean.max !== typedMax) {
        rangeNote =
          '为了让最小值 ' + clean.min + ' 生效，最大值已自动调到 ' +
          clean.max + '（' + why + '）。'
      } else if (clean.min !== typedMin) {
        rangeNote =
          '最小值已从 ' + typedMin + ' 改成 ' + clean.min + '：' + why + '。'
      }
    }
    return clean
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

  /* 四则运算里含 × 或 ÷ 的题目占比，用来判断卷面是不是退化成了纯加减 */
  function mulDivShare(questions) {
    if (!questions.length) return 1
    var hit = questions.filter(function (q) {
      return q.tokens.some(function (t) {
        return t === '×' || t === '÷'
      })
    }).length
    return hit / questions.length
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
    /* 折行的格子由 render.fitSheet 打上 .q-wrap：算式没被裁掉，但版面挤 */
    var wrapped = $('preview').querySelectorAll('.q-wrap').length
    if (rangeNote) {
      notice.textContent = rangeNote
      notice.hidden = false
    } else if (result.shortfall > 0) {
      notice.textContent =
        '当前参数下不重复的题目只有 ' + result.questions.length +
        ' 道（少于设定的 ' + settings.count +
        ' 道）。可以减少题量、扩大数值范围，或关闭「题目不重复」' +
        (settings.skipTrivial ? '、「跳过送分题」' : '') + '。'
      notice.hidden = false
    } else if (settings.mode === 'mixed' && mulDivShare(result.questions) < 0.15) {
      /* 乘除操作数太大时，乘积超出「数值范围」会被整题否掉，卷面会退化成纯加减 */
      notice.textContent =
        '这批题里乘除法很少——「乘除数范围」相对「数值范围」偏大，乘出来的数超过了结果上限。' +
        '把数值范围的最大值调大，或把乘除数范围调小，乘除题就会多起来。'
      notice.hidden = false
    } else if (wrapped > 0) {
      notice.textContent =
        '有 ' + wrapped + ' 道题的算式一行放不下，已自动折行（内容完整，不会被裁掉）。' +
        '想让版面更清爽，可以把列数改少一点。'
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
    els[k].addEventListener('change', function () {
      lastTouched = k === 'min' || k === 'max' ? k : ''
      onFormChange()
    })
  })

  /* 预设按钮：套用参数并清空自定义标题（标题改为自动生成） */
  S.settings.PRESETS.forEach(function (p) {
    var btn = doc.createElement('button')
    btn.type = 'button'
    btn.className = 'preset'
    btn.textContent = p.label
    btn.addEventListener('click', function () {
      lastTouched = ''
      rangeNote = '' // 预设是完整的一套参数，不存在「钳回可行域」的困惑
      settings = S.settings.sanitize(
        Object.assign({}, settings, p.patch, { title: '' })
      )
      refresh()
    })
    $('preset-row').appendChild(btn)
  })

  /* 重新生成：参数不变，换一批随机题——换种子即可（种子已写进网址，可复现） */
  $('btn-regen').addEventListener('click', function () {
    settings = Object.assign({}, settings, { seed: S.settings.newSeed() })
    refresh()
  })

  $('btn-print').addEventListener('click', function () {
    root.print()
  })

  root.addEventListener('resize', fitPreview)

  /* 页面隔天未刷新直接打印（含浏览器菜单打印）时，日期仍保证是当天 */
  root.addEventListener('beforeprint', S.render.refreshDates)

  refresh()
})(window)
