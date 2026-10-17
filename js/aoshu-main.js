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
    practice: $('f-practice'),
    anspage: $('f-anspage'),
    review: $('f-review'),
    title: $('f-title')
  }

  var settings = S.aoshu.settings.load()

  /*
   * 「已学」标记：与设置分开存（不进 URL），value 是知识点 id 数组。
   * 用户可能跳着学，交互是清单式：目录每一行自带圆点，点圆点直接切换
   * 已学状态（不用先切换过去），点课名才是选中知识点。顶栏「标记为已学」管当前这一课。
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
   * 复习卷范围（settings.reviewTopics）和「已学」是两回事：已学记进度，范围决定这张卷混哪几课。
   * 老用户以前的复习卷就是按已学出的，第一次没有范围记录时拿已学的课垫底，打开后看到的卷子不变；
   * 之后两边各管各的。
   */
  function hasSavedScope() {
    try {
      if (new URLSearchParams(root.location.search).has('reviewTopics')) return true
      var stored = JSON.parse(root.localStorage.getItem('sumsum:aoshu:v1'))
      return !!stored && Object.prototype.hasOwnProperty.call(stored, 'reviewTopics')
    } catch (e) {
      return false
    }
  }
  if (!hasSavedScope()) {
    settings = S.aoshu.settings.sanitize(
      Object.assign({}, settings, { reviewTopics: Array.from(learned).join(',') })
    )
  }

  /*
   * 知识点目录：L1/L2 页签 + 按大纲一行一课的列表。
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
    renderCatalog() // 只刷目录和顶栏按钮，不重新生成题目
    paintLearnedBtn()
  }

  function outlineOf(id) {
    return S.aoshu.OUTLINE.filter(function (o) {
      return o.id === id
    })[0]
  }

  var CAM_SVG =
    '<svg class="cam" viewBox="0 0 24 24" aria-label="有讲解视频"><rect x="3" y="6" width="13" height="12" rx="2"/>' +
    '<path d="M16 10l5-3v10l-5-3z"/></svg>'
  var TICK_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12l5 5 9-10"/></svg>'

  /* 目录文字全来自大纲常量（OUTLINE），没有用户输入，可以直接拼 HTML */
  function renderCatalog() {
    var wrap = $('topic-list')
    wrap.innerHTML = S.aoshu.OUTLINE.filter(function (o) {
      return o.stage === viewStage
    }).map(function (o) {
      var done = learned.has(o.id)
      var ready = !!S.aoshu.topics[o.id]
      var cls = 'tp' + (done ? ' done' : '') + (ready && o.id === settings.topic && !settings.review ? ' cur' : '')
      var dot = ready
        ? '<button type="button" class="tp-dot" data-learn="' + o.id + '" title="' +
          (done ? '取消「已学」标记' : '标为已学') + '" aria-pressed="' + done + '">' + TICK_SVG + '</button>'
        : '<span class="tp-dot" aria-hidden="true"></span>'
      var name = '<span class="no">' + o.no + '</span><span class="nm">' + o.name + '</span>' +
        (S.aoshuVideos.of(o.id) ? CAM_SVG : '')
      var btn = ready
        ? '<button type="button" class="tp-name" data-pick="' + o.id + '">' + name + '</button>'
        : '<button type="button" class="tp-name" disabled title="还没做好，敬请期待">' + name + '</button>'
      return '<div class="' + cls + '">' + dot + btn + '</div>'
    }).join('')

    /* 已学进度：只数大纲里有的，老数据里残留的 id 不算 */
    var total = S.aoshu.OUTLINE.length
    var n = S.aoshu.OUTLINE.filter(function (o) {
      return learned.has(o.id)
    }).length
    $('learned-n').textContent = '已学 ' + n + ' / ' + total
    $('learned-bar').style.width = (n / total) * 100 + '%'

    Array.prototype.forEach.call(doc.querySelectorAll('.stage-tab'), function (b) {
      b.classList.toggle('active', b.getAttribute('data-stage') === viewStage)
    })
    renderNextHint()
  }

  /* 点圆点：只标已学；点课名：切换知识点。委托绑一次，目录重绘不用重绑 */
  $('topic-list').addEventListener('click', function (ev) {
    var learn = ev.target.closest('[data-learn]')
    if (learn) return toggleLearned(learn.getAttribute('data-learn'))
    var pick = ev.target.closest('[data-pick]')
    if (pick) selectTopic(pick.getAttribute('data-pick'))
  })

  /* 顶栏：当前这一课的「标记为已学」。综合复习卷不是某一课，藏起来 */
  function paintLearnedBtn() {
    var b = $('btn-learned')
    b.hidden = settings.review
    var on = learned.has(settings.topic)
    b.classList.toggle('on', on)
    b.setAttribute('aria-pressed', String(on))
    b.querySelector('.txt').textContent = on ? '已学 ✓' : '标记为已学'
  }

  $('btn-learned').addEventListener('click', function () {
    toggleLearned(settings.topic)
  })

  /* 「接着学」：按大纲顺序指向第一个还没标已学的知识点，省得自己翻目录 */
  function renderNextHint() {
    var btn = $('btn-next')
    var next = S.aoshu.OUTLINE.filter(function (o) {
      return S.aoshu.topics[o.id] && !learned.has(o.id)
    })[0]
    if (!next || (next.id === settings.topic && !settings.review)) {
      btn.hidden = true
      return
    }
    btn.hidden = false
    btn.textContent = '接着学 → ' + next.no + ' ' + next.name + (S.aoshuVideos.of(next.id) ? '（有视频）' : '')
    btn.onclick = function () {
      if (settings.review) {
        settings = S.aoshu.settings.sanitize(Object.assign({}, settings, { review: false }))
        if (next.id === settings.topic) return refresh()
      }
      selectTopic(next.id)
    }
  }

  /* ---------- 复习卷范围：混哪几课 ---------- */

  function scopeIds(s) {
    return s.reviewTopics ? s.reviewTopics.split(',') : []
  }

  function setScope(ids) {
    settings = S.aoshu.settings.sanitize(Object.assign({}, settings, { reviewTopics: ids.join(',') }))
    refresh()
  }

  /* 勾选清单按 L1 / L2 分两组；课名来自大纲常量，没有用户输入，可以直接拼 HTML */
  function renderScope(s) {
    var box = $('review-scope')
    box.hidden = !s.review
    if (!s.review) return
    var on = {}
    scopeIds(s).forEach(function (id) {
      on[id] = 1
    })
    var ready = S.aoshu.OUTLINE.filter(function (o) {
      return S.aoshu.topics[o.id]
    })
    var html = ''
    ;['L1', 'L2'].forEach(function (stage) {
      var rows = ready.filter(function (o) {
        return o.stage === stage
      })
      if (!rows.length) return
      html += '<div class="scope-stage">' + stage + '</div>' + rows.map(function (o) {
        return '<label class="tick"><input type="checkbox" data-scope="' + o.id + '"' +
          (on[o.id] ? ' checked' : '') + ' /><span><span class="scope-no">' + o.no + '</span>' +
          o.name + '</span></label>'
      }).join('')
    })
    $('scope-list').innerHTML = html
    var n = scopeIds(s).length
    $('scope-n').textContent = n ? '已选 ' + n + ' 课' : '还没选'
  }

  $('scope-list').addEventListener('change', function (ev) {
    var box = ev.target.closest('[data-scope]')
    if (!box) return
    var ids = scopeIds(settings).filter(function (id) {
      return id !== box.getAttribute('data-scope')
    })
    if (box.checked) ids.push(box.getAttribute('data-scope'))
    setScope(ids) // sanitize 会按大纲顺序重排
  })

  $('review-scope').addEventListener('click', function (ev) {
    var b = ev.target.closest('[data-scope-act]')
    if (!b) return
    var act = b.getAttribute('data-scope-act')
    if (act === 'learned') setScope(learnedIds())
    else if (act === 'none') setScope([])
  })

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
      label.className = 'tick'
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
    els.practice.checked = s.practicePage
    els.anspage.checked = s.answerPage
    els.review.checked = s.review
    els.title.value = s.title
    Object.keys(variantEls).forEach(function (k) {
      variantEls[k].checked = s[k]
    })
    /* 综合复习卷跨多个知识点，单个知识点的题型勾选与讲解页都不适用 */
    $('group-variants').hidden = s.review
    $('tick-lesson').hidden = s.review
  }

  /* 在当前 settings 上覆盖表单值——只覆盖当前知识点的勾选框，别的知识点的变式选择保持不动 */
  function readForm() {
    var raw = Object.assign({}, settings, {
      difficulty: els.difficulty.value,
      count: els.count.value,
      lessonPage: els.lessonpage.checked,
      practicePage: els.practice.checked,
      answerPage: els.anspage.checked,
      review: els.review.checked,
      title: els.title.value.trim()
    })
    Object.keys(variantEls).forEach(function (k) {
      raw[k] = variantEls[k].checked
    })
    return S.aoshu.settings.sanitize(raw)
  }

  /* 纸张区放不下一整张 A4 时整体缩小（见 js/shell.js 的 fit） */
  function fitPreview() {
    S.shell.fit()
  }

  /* ---------- 讲解视频 ---------- */

  /*
   * 小窗在设置区最上面；「放大播放」把同一个 <video> 所在的盒子铺满屏幕（CSS 的 .is-big），
   * 不换元素，所以放大、收起时进度和播放状态都不丢。
   * 只在换课时重建：refresh() 会被改难度、改题量触发，每次重建会把正在播的视频打断。
   */
  var videoFor = null

  function durText(dur) {
    var p = dur.split(':')
    return Number(p[0]) + ' 分 ' + Number(p[1]) + ' 秒'
  }

  function setBig(on) {
    var box = $('video-box')
    if (!box) return
    box.classList.toggle('is-big', on)
    doc.body.classList.toggle('video-big', on)
  }

  function renderVideo(s) {
    var group = $('video-group')
    var vid = group.querySelector('video')
    if (s.review) {
      if (vid) vid.pause()
      group.hidden = true
      return
    }
    group.hidden = false
    if (videoFor === s.topic) return
    videoFor = s.topic
    if (vid) vid.pause()
    var v = S.aoshuVideos.of(s.topic)
    var o = outlineOf(s.topic)
    if (!v) {
      group.innerHTML = '<p class="video-none">' + CAM_SVG + '这一课还没有讲解视频</p>'
      return
    }
    /* 文字来自大纲常量和视频登记表，没有用户输入 */
    group.innerHTML =
      '<div class="row-between"><h2 class="group-title">讲解视频</h2>' +
        '<span class="lbl">' + durText(v.dur) + ' · 只在屏幕播放</span></div>' +
      '<div class="video-box" id="video-box">' +
        '<div class="video-top"><span>第 ' + o.no + ' 课 · ' + o.name + ' · 讲解视频</span>' +
          '<button type="button" class="btn" data-act="small">收起（Esc）</button></div>' +
        '<video controls preload="metadata" playsinline src="' + v.src + '"></video>' +
        '<p class="video-foot">视频只在屏幕上播放，不会打印。</p>' +
      '</div>' +
      '<button type="button" class="btn btn-sm" data-act="big">' +
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>' +
        '放大播放（给孩子看）</button>'
  }

  $('video-group').addEventListener('click', function (ev) {
    var b = ev.target.closest('[data-act]')
    if (!b) return
    setBig(b.getAttribute('data-act') === 'big')
  })

  doc.addEventListener('keydown', function (ev) {
    if (ev.key === 'Escape' && doc.body.classList.contains('video-big')) setBig(false)
  })

  /* 顶栏：第几课叫什么、这一沓纸由哪几部分组成 */
  function paintHead(s, pages) {
    var o = outlineOf(s.topic)
    $('lesson-title').textContent = s.review ? '综合复习卷' : '第 ' + o.no + ' 课 · ' + o.name
    var parts = []
    if (pages.lesson) parts.push('讲解 ' + pages.lesson + ' 页')
    if (pages.practice) parts.push('练习 ' + pages.practice + ' 页')
    if (pages.answer) parts.push('解析 ' + pages.answer + ' 页')
    S.shell.summary([parts.join(' + ')])
    paintLearnedBtn()
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
   * 综合复习卷：从勾选范围里的知识点轮着抽题。每道题都走对应知识点自己的
   * 生成器（题型勾选、难度档都沿用），所以解析、图示一切照旧；
   * 额外记下知识点名字，解析页上标出来，方便家长知道这题在考什么。
   */
  function generateReview(s) {
    var ids = scopeIds(s)
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

  var firstPaint = true

  /* 主流程：保存设置 → 同步表单 → 生成题目 → 渲染练习纸 */
  function refresh() {
    S.aoshu.settings.save(settings)
    var topic = S.aoshu.topics[settings.topic]
    var switched = builtTopicId !== topic.id
    if (switched) {
      buildVariantList(topic) // 切换知识点时重建变式勾选区
      viewStage = topic.stage // 并把目录页签切到该知识点所在阶段
    }
    renderCatalog()
    /* 从「今天」或「接着学」跳过来时，当前这一课可能在目录下半截，滚到看得见 */
    var cur = (switched || firstPaint) && doc.querySelector('#topic-list .tp.cur')
    if (cur) cur.scrollIntoView({ block: 'nearest' })
    firstPaint = false
    fillForm(settings)

    var result = settings.review ? generateReview(settings) : topic.generate(settings)
    var pages = S.aoshu.render.render($('preview'), settings, result.questions, {
      review: settings.review,
      topicCount: result.topicCount
    })
    fitPreview()
    renderVideo(settings)
    renderScope(settings)
    paintHead(settings, pages)

    var notice = $('notice')
    if (result.noTopics) {
      notice.textContent =
        '综合复习卷还没选要混哪几课。在右边「综合复习」下面勾几课就能出题了。'
      notice.hidden = false
    } else if (result.shortfall > 0) {
      notice.textContent = settings.review
        ? '选的这几课凑不出这么多不重复的题（只有 ' + result.questions.length +
          ' 道）。可以减少题量，或在右边多勾几课。'
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
