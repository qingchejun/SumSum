/**
 * 设置管理：默认值、预设、输入校验（钳位）、localStorage 持久化、URL 参数编解码。
 * 加载优先级：默认值 ← localStorage ← URL 参数（方便收藏「每日固定题型」链接）。
 */
(function (root) {
  'use strict'

  var KEY = 'sumsum:settings:v1'

  var DEFAULTS = Object.freeze({
    mode: 'addsub',
    min: 0,
    max: 20,
    count: 20,
    columns: 3,
    allowNegative: false, // 「减法不出负数」默认开 → allowNegative 默认 false
    exactDivision: true,
    carryMode: 'random',
    mulMin: 1,
    mulMax: 9,
    noDuplicates: true,
    blankMode: 'end',
    answerPage: false,
    paper: 'portrait',
    parens: false,
    title: ''
  })

  var MODES = ['add', 'sub', 'addsub', 'mul', 'div', 'muldiv', 'mixed']
  var CARRY = ['random', 'nocarry', 'carryonly']
  var BLANK = ['end', 'random']
  var PAPER = ['portrait', 'landscape']

  var PRESETS = [
    { label: '10以内加减', patch: { mode: 'addsub', min: 0, max: 10, carryMode: 'random' } },
    { label: '20以内进退位', patch: { mode: 'addsub', min: 0, max: 20, carryMode: 'carryonly' } },
    { label: '100以内加减', patch: { mode: 'addsub', min: 0, max: 100, carryMode: 'random' } },
    { label: '乘法口诀', patch: { mode: 'mul', mulMin: 1, mulMax: 9 } },
    { label: '四则入门', patch: { mode: 'mixed', min: 0, max: 20, parens: false } }
  ]

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
    var out = {
      mode: oneOf(s.mode, MODES, DEFAULTS.mode),
      min: clampInt(s.min, 0, 9999, DEFAULTS.min),
      max: clampInt(s.max, 1, 10000, DEFAULTS.max),
      count: clampInt(s.count, 10, 100, DEFAULTS.count),
      columns: clampInt(s.columns, 2, 4, DEFAULTS.columns),
      allowNegative: toBool(s.allowNegative, DEFAULTS.allowNegative),
      exactDivision: toBool(s.exactDivision, DEFAULTS.exactDivision),
      carryMode: oneOf(s.carryMode, CARRY, DEFAULTS.carryMode),
      mulMin: clampInt(s.mulMin, 1, 999, DEFAULTS.mulMin),
      mulMax: clampInt(s.mulMax, 1, 999, DEFAULTS.mulMax),
      noDuplicates: toBool(s.noDuplicates, DEFAULTS.noDuplicates),
      blankMode: oneOf(s.blankMode, BLANK, DEFAULTS.blankMode),
      answerPage: toBool(s.answerPage, DEFAULTS.answerPage),
      paper: oneOf(s.paper, PAPER, DEFAULTS.paper),
      parens: toBool(s.parens, DEFAULTS.parens),
      title: String(s.title == null ? '' : s.title).slice(0, 30)
    }
    if (out.max <= out.min) out.max = out.min + 10
    if (out.mulMax < out.mulMin) out.mulMax = out.mulMin
    /* 含加法的模式要求 2×min ≤ max，否则「两个加数 ≥ min 且和 ≤ max」无解，
       加法会永远生成失败（加减混合还会悄悄变成纯减法卷）—— 提前把 min 钳回可行域 */
    if ((out.mode === 'add' || out.mode === 'addsub' || out.mode === 'mixed') && out.min * 2 > out.max) {
      out.min = Math.floor(out.max / 2)
    }
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
  root.SumSum.settings = {
    DEFAULTS: DEFAULTS,
    PRESETS: PRESETS,
    sanitize: sanitize,
    load: load,
    save: save
  }
})(typeof window !== 'undefined' ? window : globalThis)
