/**
 * 奥数页交互：表单 ↔ 设置对象双向同步、按知识点动态渲染变式勾选、
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
    difficulty: $('f-difficulty'),
    count: $('f-count'),
    lessonpage: $('f-lessonpage'),
    anspage: $('f-anspage'),
    title: $('f-title')
  }

  var settings = S.aoshu.settings.load()

  /*
   * 知识点目录：L1/L2 页签 + 按大纲渲染的胶囊按钮。
   * viewStage 是纯浏览状态（看哪个页签），与当前选中的知识点无关；
   * 未实现的知识点（OUTLINE 里有、topics 里没有）渲染为灰色不可点。
   */
  var viewStage = (S.aoshu.topics[settings.topic] || { stage: 'L1' }).stage

  function selectTopic(id) {
    if (id === settings.topic) return
    settings = S.aoshu.settings.sanitize(
      Object.assign({}, settings, { topic: id, title: '' })
    )
    refresh()
  }

  function renderCatalog() {
    var wrap = $('topic-chips')
    wrap.innerHTML = ''
    S.aoshu.OUTLINE.filter(function (o) {
      return o.stage === viewStage
    }).forEach(function (o) {
      var btn = doc.createElement('button')
      btn.type = 'button'
      btn.className = 'topic-chip'
      btn.textContent = o.no + ' ' + o.name
      if (S.aoshu.topics[o.id]) {
        if (o.id === settings.topic) btn.classList.add('active')
        btn.addEventListener('click', function () {
          selectTopic(o.id)
        })
      } else {
        btn.disabled = true
        btn.title = '还没做好，敬请期待'
      }
      wrap.appendChild(btn)
    })
    Array.prototype.forEach.call(doc.querySelectorAll('.stage-tab'), function (b) {
      b.classList.toggle('active', b.getAttribute('data-stage') === viewStage)
    })
  }

  Array.prototype.forEach.call(doc.querySelectorAll('.stage-tab'), function (b) {
    b.addEventListener('click', function () {
      viewStage = b.getAttribute('data-stage')
      renderCatalog()
    })
  })

  /* 变式勾选区：由当前知识点的 variants 动态渲染，checkbox 对应设置字段 */
  var variantEls = {}
  var builtTopicId = null
  function buildVariantList(topic) {
    builtTopicId = topic.id
    var wrap = $('variant-list')
    wrap.innerHTML = ''
    variantEls = {}
    topic.variants.forEach(function (v) {
      var label = doc.createElement('label')
      label.className = 'check'
      var box = doc.createElement('input')
      box.type = 'checkbox'
      var span = doc.createElement('span')
      span.textContent = v.label
      label.appendChild(box)
      label.appendChild(span)
      wrap.appendChild(label)
      box.addEventListener('change', onFormChange)
      variantEls[v.setting] = box
    })
  }

  function fillForm(s) {
    els.difficulty.value = s.difficulty
    els.count.value = s.count
    els.lessonpage.checked = s.lessonPage
    els.anspage.checked = s.answerPage
    els.title.value = s.title
    Object.keys(variantEls).forEach(function (k) {
      variantEls[k].checked = s[k]
    })
  }

  /* 在当前 settings 上覆盖表单值——只覆盖当前知识点的勾选框，别的知识点的变式选择保持不动 */
  function readForm() {
    var raw = Object.assign({}, settings, {
      difficulty: els.difficulty.value,
      count: els.count.value,
      lessonPage: els.lessonpage.checked,
      answerPage: els.anspage.checked,
      title: els.title.value.trim()
    })
    Object.keys(variantEls).forEach(function (k) {
      raw[k] = variantEls[k].checked
    })
    return S.aoshu.settings.sanitize(raw)
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

  /* 主流程：保存设置 → 同步表单 → 生成题目 → 渲染练习纸 */
  function refresh() {
    S.aoshu.settings.save(settings)
    var topic = S.aoshu.topics[settings.topic]
    if (builtTopicId !== topic.id) {
      buildVariantList(topic) // 切换知识点时重建变式勾选区
      viewStage = topic.stage // 并把目录页签切到该知识点所在阶段
    }
    renderCatalog()
    fillForm(settings)
    var result = topic.generate(settings)
    S.aoshu.render.render($('preview'), settings, result.questions)
    fitPreview()

    var notice = $('notice')
    if (result.shortfall > 0) {
      notice.textContent =
        '当前参数下不重复的题目只有 ' + result.questions.length +
        ' 道（少于设定的 ' + settings.count +
        ' 道）。可以减少题量、提高难度档，或多勾选几种题型。'
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

  buildVariantList(S.aoshu.topics[settings.topic])

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
