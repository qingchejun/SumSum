/**
 * 数独页设置管理：默认值、输入校验（钳位）、localStorage 持久化、URL 参数编解码。
 * 加载优先级：默认值 ← localStorage ← URL 参数。
 * 套路与 js/settings.js 完全一致，只是字段不同。
 */
(function (root) {
  'use strict'

  var KEY = 'sumsum:shudu:v1'

  var DEFAULTS = Object.freeze({
    shape: 's4', // 四宫格是真正意义上最小的标准数独，一年级的默认起点
    clues: 7, // 给几个提示 = 难度，范围随盘型变，见 shudu-core 的 CLUE_RANGE
    count: 4,
    copies: 1, // 2 = 同一道题连印两份，父子各一张同题比赛
    noDuplicates: true,
    answerPage: false,
    playMode: true, // 屏幕上可点击作答；打印时与它无关
    seed: 0, // 0 = 未指定；load() 会补一个随机种子
    title: ''
  })

  var SHAPES = ['s4', 's6']

  /* 旧版本用「简单/普通/挑战」三档，链接里是 ?level=hard。三档已经换成直接选提示数，
     这里把老链接翻译过去，免得收藏的链接打开变成默认难度。 */
  var LEGACY_LEVEL = {
    s4: { easy: 9, normal: 7, hard: 5 },
    s6: { easy: 20, normal: 16, hard: 13 }
  }

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
    var shape = oneOf(s.shape, SHAPES, DEFAULTS.shape)
    var given = raw || {}
    var clues
    if (given.clues != null && given.clues !== '') {
      clues = given.clues
    } else if (given.level && LEGACY_LEVEL[shape][given.level]) {
      /* 老链接带的是 level=hard 而不是 clues=5，翻译过去 */
      clues = LEGACY_LEVEL[shape][given.level]
    } else {
      /* 没指定就用【该盘型自己的】默认值。不能直接用 DEFAULTS.clues（那是四宫格的 7）——
         手敲 ?shape=s6 进来会被钳到六宫格下限 13，一上来就是最难的。 */
      clues = root.SumSum.shudu.clueRange(shape).def
    }
    return {
      shape: shape,
      /* 钳位规则在 shudu-core：范围随盘型变（四宫格 5~12、六宫格 13~26），
         下限取的是实测 100% 能挖到的值，保证面板写几个、卷子上就是几个 */
      clues: root.SumSum.shudu.clampClues(shape, clues),
      /* 一页一大题，20 题就是 20 页（对战双份则是 40 页），再多没意义 */
      count: clampInt(s.count, 1, 20, DEFAULTS.count),
      copies: clampInt(s.copies, 1, 2, DEFAULTS.copies),
      noDuplicates: toBool(s.noDuplicates, DEFAULTS.noDuplicates),
      answerPage: toBool(s.answerPage, DEFAULTS.answerPage),
      playMode: toBool(s.playMode, DEFAULTS.playMode),
      seed: clampInt(s.seed, 0, 999999999, DEFAULTS.seed),
      title: String(s.title == null ? '' : s.title).slice(0, 30)
    }
  }

  /* 随机种子：同一个种子必定生成同一批题，用来复现/分享具体的某一张卷子 */
  function newSeed() {
    return Math.floor(Math.random() * 999999998) + 1
  }

  /*
   * 读取设置。网址里带参数时**完全忽略** localStorage —— save() 会把所有非默认项
   * 写进网址，所以「默认值 + 网址参数」正好复原分享者当时的设置。若仍旧叠加本地
   * 存储，收到链接的人会被自己存的盘型/难度覆盖掉，拿到的卷子和分享者的对不上。
   */
  function load() {
    var fromUrl = {}
    var hasUrl = false
    try {
      new URLSearchParams(root.location.search).forEach(function (v, k) {
        /* level 已不在 DEFAULTS 里（三档难度换成了直接选提示数），
           但老链接里还带着它，得放行给 sanitize 去翻译 */
        if (Object.prototype.hasOwnProperty.call(DEFAULTS, k) || k === 'level') {
          fromUrl[k] = v
          hasUrl = true
        }
      })
    } catch (e) {
      fromUrl = {}
    }
    var base = {}
    if (!hasUrl) {
      try {
        base = JSON.parse(root.localStorage.getItem(KEY)) || {}
      } catch (e) {
        base = {} // 隐私模式或数据损坏时回退默认值
      }
      delete base.seed // 从书签进来应当是新的一批题，不沿用上次的种子
    }
    var out = sanitize(Object.assign({}, base, fromUrl))
    if (!out.seed) out.seed = newSeed()
    return out
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
  root.SumSum.shuduSettings = {
    DEFAULTS: DEFAULTS,
    sanitize: sanitize,
    newSeed: newSeed,
    load: load,
    save: save
  }
})(typeof window !== 'undefined' ? window : globalThis)
