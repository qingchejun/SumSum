/**
 * 「今天」首页的数据：从各板块存在浏览器里的东西，拼出四张卡片要显示的内容。
 *
 * 只读不写。每张卡片说的都必须和点进板块后看到的一致，所以能复用板块自己的
 * sanitize / sliceOf 就复用，不另写一套规则（例：识字周次越界怎么钳，以 shizi-core 为准）。
 *
 * 「打印」链接一律是板块页 + #print：板块页照常用上次的设置渲染，再在纸张上方弹一条
 * 「确认打印」（见 js/shell.js）。识字、口算、数独【不能】往链接里塞设置参数 ——
 * 它们的 load() 看到网址参数就整个忽略本地存储，进度会被打回默认值。
 * 奥数例外：它是「本地存储 ← 网址参数」叠加，带 topic 只会换课、不丢别的设置。
 *
 * 无 DOM 依赖，node 下由 tools/check-today.js 校验。
 */
;(function (root) {
  'use strict'

  var WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']

  var PAPER_LABELS = { portrait: 'A4 纵向', landscape: 'A4 横向' }

  /* 读一个键并解析 JSON。存储不可用、键不存在、内容坏了，一律返回 null */
  function readJson(storage, key) {
    try {
      var raw = storage.getItem(key)
      return raw == null ? null : JSON.parse(raw)
    } catch (e) {
      return null
    }
  }

  function isObj(v) {
    return !!v && typeof v === 'object' && !Array.isArray(v)
  }

  function dateText(now) {
    return (now.getMonth() + 1) + ' 月 ' + now.getDate() + ' 日 星期' + WEEKDAYS[now.getDay()]
  }

  /* ---------- 奥数 ---------- */

  function aoshuCard(storage) {
    var A = root.SumSum.aoshu
    var V = root.SumSum.aoshuVideos
    var list = readJson(storage, 'sumsum:aoshu:learned:v1')
    var learned = {}
    if (Array.isArray(list)) {
      list.forEach(function (id) {
        if (typeof id === 'string') learned[id] = true
      })
    }
    var outline = A.OUTLINE
    var done = outline.filter(function (o) {
      return learned[o.id]
    }).length
    var nextEntry = outline.filter(function (o) {
      return !learned[o.id]
    })[0]

    /* 讲解页 / 解析页的开关沿用上次的设置；练习题总是印的 */
    var s = readJson(storage, 'sumsum:aoshu:v1')
    if (!isObj(s)) s = {}
    var parts = []
    if (s.lessonPage !== false) parts.push('讲解')
    parts.push('练习')
    if (s.answerPage !== false) parts.push('解析')

    var next = nextEntry ? { no: nextEntry.no, id: nextEntry.id, name: nextEntry.name } : null
    var href = next ? 'aoshu.html?topic=' + next.id + '&review=false' : 'aoshu.html?review=true'
    return {
      learned: done,
      total: outline.length,
      next: next,
      video: next ? V.of(next.id) : null,
      parts: parts.join(' + '),
      href: href,
      printHref: href + '#print'
    }
  }

  /* ---------- 识字 ---------- */

  function shiziCard(storage) {
    var Z = root.SumSum.shizi
    var raw = readJson(storage, 'sumsum:shizi:v1')
    var s = root.SumSum.shiziSettings.sanitize(isObj(raw) ? raw : {})
    var slice = Z.sliceOf(s.week, s.perWeek)

    var marks = readJson(storage, 'sumsum:shizi:wrong:v2')
    var wrong = 0
    var repeats = 0
    if (isObj(marks)) {
      Object.keys(marks).forEach(function (ch) {
        var e = marks[ch]
        if (!isObj(e)) return
        if (Z.markState(e) !== 'out') wrong++
        if (Z.markCount(e) >= 2) repeats++
      })
    }

    return {
      mode: s.mode,
      week: slice.week,
      weeks: slice.weeks,
      from: slice.from,
      to: slice.to,
      wrong: wrong,
      repeats: repeats,
      withWrong: s.withWrong,
      href: 'shizi.html',
      printHref: 'shizi.html#print'
    }
  }

  /* ---------- 口算 ---------- */

  function kousuanCard(storage) {
    var raw = readJson(storage, 'sumsum:settings:v1')
    var K = root.SumSum.settings
    var s = K.sanitize(isObj(raw) ? raw : {})
    var mode = K.MODE_LABELS[s.mode]
    /* 命中预设就用预设名当标题 —— 家长认的是「20以内进退位」这个名字 */
    var preset = K.presetOf(s)
    var meta = [s.count + ' 题', s.columns + ' 列', PAPER_LABELS[s.paper]]
    if (preset) meta.unshift(mode)
    return {
      title: preset || mode,
      meta: meta.join(' · '),
      href: 'kousuan.html',
      printHref: 'kousuan.html#print'
    }
  }

  /* ---------- 数独 ---------- */

  function shuduCard(storage) {
    var D = root.SumSum.shudu
    var raw = readJson(storage, 'sumsum:shudu:v1')
    var s = root.SumSum.shuduSettings.sanitize(isObj(raw) ? raw : {})
    var meta = [
      s.count + ' 题',
      s.copies > 1 ? '2 份（同题对战）' : '1 份',
      s.perPage ? s.perPage + ' 题 / 页' : '自动排版'
    ]
    return {
      title: D.shapeOf(s.shape).name + ' · ' + s.clues + ' 个提示',
      meta: meta.join(' · '),
      href: 'shudu.html',
      printHref: 'shudu.html#print'
    }
  }

  function build(storage, now) {
    return {
      date: dateText(now),
      aoshu: aoshuCard(storage),
      shizi: shiziCard(storage),
      kousuan: kousuanCard(storage),
      shudu: shuduCard(storage)
    }
  }

  root.SumSum = root.SumSum || {}
  root.SumSum.today = { build: build }
})(typeof window !== 'undefined' ? window : globalThis)
