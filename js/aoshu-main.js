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
    review: $('f-review'),
    title: $('f-title')
  }

  var settings = S.aoshu.settings.load()

  /*
   * 「已学」标记：与设置分开存（不进 URL），value 是知识点 id 数组。
   * 用户可能跳着学，交互是清单式：每个胶囊自带圆点，点圆点直接切换
   * 已学状态（不用先切换过去），点名称才是选中知识点；页签上显示进度。
   */
  var LEARNED_KEY = 'sumsum:aoshu:learned:v1'

  function loadLearned() {
    try {
      var arr = JSON.parse(root.localStorage.getItem(LEARNED_KEY))
      return new Set(Array.isArray(arr) ? arr : [])
    } catch (e) {
      return new Set()
    }
  }

  function saveLearned(set) {
    try {
      root.localStorage.setItem(LEARNED_KEY, JSON.stringify(Array.from(set)))
    } catch (e) {
      /* 隐私模式下写入失败可忽略 */
    }
  }

  var learned = loadLearned()

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

  function toggleLearned(id) {
    if (learned.has(id)) learned.delete(id)
    else learned.add(id)
    saveLearned(learned)
    renderCatalog() // 只刷目录，不重新生成题目
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
      if (learned.has(o.id)) btn.classList.add('done')
      if (S.aoshu.topics[o.id]) {
        var dot = doc.createElement('span')
        dot.className = 'chip-dot'
        dot.textContent = learned.has(o.id) ? '✓' : ''
        dot.title = learned.has(o.id) ? '取消「已学」标记' : '标为已学'
        btn.appendChild(dot)
        var name = doc.createElement('span')
        name.textContent = o.no + ' ' + o.name
        btn.appendChild(name)
        if (o.id === settings.topic) btn.classList.add('active')
        btn.addEventListener('click', function (ev) {
          if (ev.target === dot) toggleLearned(o.id) // 点圆点：只标已学
          else selectTopic(o.id) // 点名称：切换知识点
        })
      } else {
        btn.textContent = o.no + ' ' + o.name
        btn.disabled = true
        btn.title = '还没做好，敬请期待'
      }
      wrap.appendChild(btn)
    })
    /* 页签高亮 + 已学进度（如「L1 · 立足算理 5/20」） */
    var TAB_LABEL = { L1: 'L1 · 立足算理', L2: 'L2 · 思维启蒙' }
    Array.prototype.forEach.call(doc.querySelectorAll('.stage-tab'), function (b) {
      var stage = b.getAttribute('data-stage')
      var all = S.aoshu.OUTLINE.filter(function (o) {
        return o.stage === stage
      })
      var done = all.filter(function (o) {
        return learned.has(o.id)
      }).length
      b.textContent = TAB_LABEL[stage] + (done > 0 ? ' ' + done + '/' + all.length : '')
      b.classList.toggle('active', stage === viewStage)
    })
    renderNextHint()
    renderReviewHint()
  }

  /* 「接着学」：按大纲顺序指向第一个还没标已学的知识点，省得自己翻目录 */
  function renderNextHint() {
    var btn = $('btn-next')
    var next = S.aoshu.OUTLINE.filter(function (o) {
      return S.aoshu.topics[o.id] && !learned.has(o.id)
    })[0]
    if (!next || next.id === settings.topic || settings.review) {
      btn.hidden = true
      return
    }
    btn.hidden = false
    btn.textContent = '接着学 → ' + next.no + ' ' + next.name
    btn.onclick = function () {
      selectTopic(next.id)
    }
  }

  function renderReviewHint() {
    var hint = $('review-hint')
    var n = learnedIds().length
    hint.hidden = false
    hint.textContent = n
      ? '已学 ' + n + ' 个知识点，可以混着出题了。'
      : '还没标记已学的知识点——先在上面的目录里点圆点标几个。'
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
    els.review.checked = s.review
    els.title.value = s.title
    Object.keys(variantEls).forEach(function (k) {
      variantEls[k].checked = s[k]
    })
    /* 综合复习卷跨多个知识点，单个知识点的题型勾选与讲解页都不适用 */
    $('group-variants').hidden = s.review
    $('f-lessonpage').closest('.check').hidden = s.review
  }

  /* 在当前 settings 上覆盖表单值——只覆盖当前知识点的勾选框，别的知识点的变式选择保持不动 */
  function readForm() {
    var raw = Object.assign({}, settings, {
      difficulty: els.difficulty.value,
      count: els.count.value,
      lessonPage: els.lessonpage.checked,
      answerPage: els.anspage.checked,
      review: els.review.checked,
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

  /* 已学且已实现的知识点，按大纲顺序 */
  function learnedIds() {
    return S.aoshu.OUTLINE.filter(function (o) {
      return learned.has(o.id) && S.aoshu.topics[o.id]
    }).map(function (o) {
      return o.id
    })
  }

  /*
   * 综合复习卷：从已学的知识点里轮着抽题。每道题都走对应知识点自己的
   * 生成器（题型勾选、难度档都沿用），所以解析、图示一切照旧；
   * 额外记下知识点名字，解析页上标出来，方便家长知道这题在考什么。
   */
  function generateReview(s) {
    var ids = learnedIds()
    if (!ids.length) return { questions: [], shortfall: s.count, noTopics: true }
    var out = []
    var seen = {}
    var attempts = s.count * 80
    for (var i = 0; i < attempts && out.length < s.count; i++) {
      var id = ids[Math.floor(Math.random() * ids.length)]
      var sub = S.aoshu.settings.sanitize(
        Object.assign({}, s, { topic: id, count: 1, review: false })
      )
      var q = S.aoshu.topics[id].generate(sub).questions[0]
      if (!q) continue
      var k = id + '#' + q.key
      if (seen[k]) continue
      seen[k] = 1
      var entry = S.aoshu.OUTLINE.filter(function (o) {
        return o.id === id
      })[0]
      out.push(Object.assign({}, q, { topicLabel: entry.no + ' ' + entry.name }))
    }
    return { questions: out, shortfall: s.count - out.length, topicCount: ids.length }
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

    var result = settings.review ? generateReview(settings) : topic.generate(settings)
    S.aoshu.render.render($('preview'), settings, result.questions, {
      review: settings.review,
      topicCount: result.topicCount
    })
    fitPreview()

    var notice = $('notice')
    if (result.noTopics) {
      notice.textContent =
        '还没有标记过「已学」的知识点，综合复习卷没题可出。' +
        '在上面的目录里点知识点左边的圆点，把学过的标上 ✓ 就可以了。'
      notice.hidden = false
    } else if (result.shortfall > 0) {
      notice.textContent = settings.review
        ? '已学的知识点里凑不出这么多不重复的题（只有 ' + result.questions.length +
          ' 道）。可以减少题量，或再标几个知识点为已学。'
        : '当前参数下不重复的题目只有 ' + result.questions.length +
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
