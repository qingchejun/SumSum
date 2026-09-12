/**
 * 识字页设置管理：默认值、输入校验（钳位）、localStorage 持久化、URL 参数编解码。
 * 加载优先级：默认值 ← localStorage ← URL 参数。套路与 js/shudu-settings.js 一致。
 *
 * 与其它板块最大的不同：week（复习到第几周）也是设置项。
 * 奥数的「已学」进度是刻意不进 URL 的，但这里的 week 就是决定印什么的核心参数 ——
 * 不进 URL 就没法把「第 3 周那一张」收藏下来或发给人，所以它和别的参数一视同仁。
 */
(function (root) {
  'use strict'

  var KEY = 'sumsum:shizi:v1'

  var DEFAULTS = Object.freeze({
    week: 1, // 复习到第几周；打开页面就停在上次的位置
    perWeek: 100, // 每周复习多少字。100 字正好一张 A4，16 周走完一轮
    /* 一页印几个字。0 = 自动：由 shizi-render 的 layout() 在「字不小于 6mm」
       的前提下尽量排成一页（100 字时是 10×10、每字约 10.7mm）。
       手动挡是给「想印大一点、一周拆两张」的情况留的。 */
    perPage: 0,
    font: 'kai', // 'kai' 楷体 | 'hei' 黑体。默认楷体，课本和洪恩里都是楷体字形
    copies: 1,
    /* 整表核对：一次把全部字按原始截图的 15×12 结构印出来，
       专门用来和洪恩的字表截图逐屏对照，确认转录没出错。平时不开。 */
    proof: false,
    title: ''
  })

  var FONTS = ['kai', 'hei']

  /*
   * 每页字数的合法取值，必须与 shizi.html 里 #f-perpage 的 <option> 一一对应。
   * 不能用「0~200 之间的整数」那样的区间钳位 —— 手敲 ?perPage=37 进来，
   * 值本身合法，但下拉框里没有这一项，fillForm 会把 select 置成空白；
   * 用户随手动一下别的控件，readForm 读回空串、悄悄退回「自动」，
   * 连网址里的 perPage 也被 save() 抹掉，全程没有任何提示。
   * 导出给 tools/check-shizi.js 用，省得两边各写一份迟早写歪。
   */
  var PER_PAGE = [0, 25, 50, 60, 100]

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
    /* 每周字数上限 200：再多就一页放不下、字也小到 6mm 的下限附近了。
       下限 10 是给「这周只挑十个难字过一遍」留的。 */
    var perWeek = clampInt(s.perWeek, 10, 200, DEFAULTS.perWeek)
    return {
      perWeek: perWeek,
      /* week 必须在 perWeek 定下来之后再钳 —— 每周字数一改，总周数跟着变，
         原来的第 16 周可能已经越界了。 */
      week: root.SumSum.shizi.clampWeek(s.week, perWeek),
      perPage: oneOf(clampInt(s.perPage, 0, 200, DEFAULTS.perPage), PER_PAGE, DEFAULTS.perPage),
      font: oneOf(s.font, FONTS, DEFAULTS.font),
      copies: clampInt(s.copies, 1, 2, DEFAULTS.copies),
      proof: toBool(s.proof, DEFAULTS.proof),
      title: String(s.title == null ? '' : s.title).slice(0, 30)
    }
  }

  /*
   * 读取设置。网址里带参数时**完全忽略** localStorage —— 与口算/数独同一个理由：
   * save() 会把所有非默认项写进网址，收到链接的人若还叠加自己的本地存储，
   * 拿到的就不是分享者那一周的字了。
   */
  function load() {
    var fromUrl = {}
    var hasUrl = false
    try {
      new URLSearchParams(root.location.search).forEach(function (v, k) {
        if (Object.prototype.hasOwnProperty.call(DEFAULTS, k)) {
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
      /* 核对模式是个一次性的动作，不该被记住 —— 下次打开应当回到正常印卷子 */
      delete base.proof
    }
    return sanitize(Object.assign({}, base, fromUrl))
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
  root.SumSum.shiziSettings = {
    DEFAULTS: DEFAULTS,
    PER_PAGE: PER_PAGE,
    sanitize: sanitize,
    load: load,
    save: save
  }
})(typeof window !== 'undefined' ? window : globalThis)
