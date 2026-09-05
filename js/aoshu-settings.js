/**
 * 奥数页设置管理：与口算页 settings.js 同一套路（默认值 ← localStorage ← URL 参数），
 * 但用独立的 localStorage key，两页设置互不干扰。
 */
(function (root) {
  'use strict'

  var KEY = 'sumsum:aoshu:v1'

  var DEFAULTS = Object.freeze({
    topic: 'yiduobushao',
    difficulty: 'L1', // L1/L2/L3 → 20/50/100 以内
    vMove: true,
    vOrigDiff: true,
    vAfterDiff: false, // 稍难，默认关
    count: 5, // 每页 5 题，默认正好 1 页
    lessonPage: true, // 讲解页：新知识点先看讲解再做题，默认开
    answerPage: true, // 解析是本板块核心，默认开
    title: ''
  })

  var DIFFICULTIES = ['L1', 'L2', 'L3']

  function clampInt(v, min, max, fallback) {
    if (v === '' || v == null) return fallback // Number('') === 0，需单独处理空输入
    var n = Number(v)
    if (!Number.isFinite(n)) return fallback
    return Math.min(max, Math.max(min, Math.round(n)))
  }

  function toBool(v, fallback) {
    if (v === true || v === 'true' || v === '1') return true
    if (v === false || v === 'false' || v === '0') return false
    return fallback
  }

  function oneOf(v, list, fallback) {
    return list.indexOf(v) >= 0 ? v : fallback
  }

  /* 把任意来源（表单 / localStorage / URL）的原始值清洗成合法设置对象 */
  function sanitize(raw) {
    var s = Object.assign({}, DEFAULTS, raw)
    var topics = root.SumSum.aoshu.topics
    var out = {
      topic: topics[s.topic] ? s.topic : DEFAULTS.topic,
      difficulty: oneOf(s.difficulty, DIFFICULTIES, DEFAULTS.difficulty),
      vMove: toBool(s.vMove, DEFAULTS.vMove),
      vOrigDiff: toBool(s.vOrigDiff, DEFAULTS.vOrigDiff),
      vAfterDiff: toBool(s.vAfterDiff, DEFAULTS.vAfterDiff),
      count: clampInt(s.count, 4, 30, DEFAULTS.count),
      lessonPage: toBool(s.lessonPage, DEFAULTS.lessonPage),
      answerPage: toBool(s.answerPage, DEFAULTS.answerPage),
      title: String(s.title == null ? '' : s.title).slice(0, 30)
    }
    /* 变式全取消时无题可出，强制回落到第一个变式 */
    if (!out.vMove && !out.vOrigDiff && !out.vAfterDiff) out.vMove = true
    return out
  }

  /* 读取：默认值 ← localStorage ← URL 参数 */
  function load() {
    var stored = {}
    try {
      stored = JSON.parse(root.localStorage.getItem(KEY)) || {}
    } catch (e) {
      stored = {} // 隐私模式或数据损坏时回退默认值
    }
    var fromUrl = {}
    try {
      new URLSearchParams(root.location.search).forEach(function (v, k) {
        if (Object.prototype.hasOwnProperty.call(DEFAULTS, k)) fromUrl[k] = v
      })
    } catch (e) {
      fromUrl = {}
    }
    return sanitize(Object.assign({}, stored, fromUrl))
  }

  /* 保存：写 localStorage，并把「非默认值」的项同步进 URL（保持链接干净可收藏） */
  function save(s) {
    try {
      root.localStorage.setItem(KEY, JSON.stringify(s))
    } catch (e) {
      /* 隐私模式下写入失败可忽略 */
    }
    try {
      var params = new URLSearchParams()
      Object.keys(DEFAULTS).forEach(function (k) {
        if (s[k] !== DEFAULTS[k]) params.set(k, String(s[k]))
      })
      var qs = params.toString()
      root.history.replaceState(null, '', qs ? '?' + qs : root.location.pathname)
    } catch (e) {
      /* file:// 协议下 replaceState 可能受限，忽略 */
    }
  }

  root.SumSum = root.SumSum || {}
  root.SumSum.aoshu = root.SumSum.aoshu || {}
  root.SumSum.aoshu.settings = {
    DEFAULTS: DEFAULTS,
    sanitize: sanitize,
    load: load,
    save: save
  }
})(typeof window !== 'undefined' ? window : globalThis)
