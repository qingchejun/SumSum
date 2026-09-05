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
    topic: $('f-topic'),
    difficulty: $('f-difficulty'),
    count: $('f-count'),
    lessonpage: $('f-lessonpage'),
    anspage: $('f-anspage'),
    title: $('f-title')
  }

  var settings = S.aoshu.settings.load()

  /* 知识点下拉：只有一个知识点时整组隐藏（后续注册第二个知识点会自动出现） */
  S.aoshu.topicList.forEach(function (t) {
    var opt = doc.createElement('option')
    opt.value = t.id
    opt.textContent = t.name
    els.topic.appendChild(opt)
  })
  $('topic-group').hidden = S.aoshu.topicList.length === 1

  /* 变式勾选区：由当前知识点的 variants 动态渲染，checkbox 对应设置字段 */
  var variantEls = {}
  function buildVariantList(topic) {
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
    els.topic.value = s.topic
    els.difficulty.value = s.difficulty
    els.count.value = s.count
    els.lessonpage.checked = s.lessonPage
    els.anspage.checked = s.answerPage
    els.title.value = s.title
    Object.keys(variantEls).forEach(function (k) {
      variantEls[k].checked = s[k]
    })
  }

  function readForm() {
    var raw = {
      topic: els.topic.value,
      difficulty: els.difficulty.value,
      count: els.count.value,
      lessonPage: els.lessonpage.checked,
      answerPage: els.anspage.checked,
      title: els.title.value.trim()
    }
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
    fillForm(settings)

    var topic = S.aoshu.topics[settings.topic]
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
