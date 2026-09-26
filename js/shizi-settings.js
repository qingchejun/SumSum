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
    /*
     * 看哪一张卷子：
     *   week  本周复习 —— 主场景，按周次印该复习的那一批字
     *   wrong 错字集   —— 把攒下来的错字单独印一张
     * 两种模式下字格都可以点，点一下就是把那个字加入 / 移出错字集（见 shizi-mark）。
     */
    mode: 'week',
    /*
     * 本周复习卷后面要不要再附一页错字。见 LOCAL_ONLY —— 这一项不进网址。
     */
    withWrong: false,
    title: ''
  })

  /*
   * 【只存本机、绝不进网址】的设置项。
   *
   * 错字集本身从来只在 localStorage 里（见 js/shizi-mark.js 的 KEY），
   * 是孩子的个人进度，不是卷子的参数。withWrong 是它的开关，跟着它走：
   * 网址是拿来分享的，别人点开这个站应该是干净的默认状态，而不是
   * 「开关打开了、但他自己的错字集是空的，附页凭空消失」这种对不上的状态。
   *
   * 注意它在 load() 里要【特殊处理】：网址带参数时本来是完全忽略 localStorage 的，
   * 但本机私有项必须留下来 —— 否则用户自己的网址上只要有个 ?week=3，
   * 每次刷新这个开关就被抹回 false。
   */
  var LOCAL_ONLY = ['withWrong']

  var FONTS = ['kai', 'hei']

  var MODES = ['week', 'wrong']

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

  /*
   * 模式。曾经还有一个「整表核对」（?mode=proof，更早是 ?proof=true），字表核对完后下架了；
   * 老链接里的 mode=proof 不在白名单里，自然回到本周复习，?proof= 参数 load() 不再放行。
   */
  function pickMode(given, merged) {
    if (given.mode != null && given.mode !== '') return oneOf(String(given.mode), MODES, DEFAULTS.mode)
    return oneOf(merged.mode, MODES, DEFAULTS.mode)
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
      mode: pickMode(raw || {}, s),
      withWrong: toBool(s.withWrong, DEFAULTS.withWrong),
      copies: clampInt(s.copies, 1, 2, DEFAULTS.copies),
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
        /* LOCAL_ONLY 的项 save() 不会写进网址，手敲进来的也不认。 */
        if (LOCAL_ONLY.indexOf(k) >= 0) return
        if (Object.prototype.hasOwnProperty.call(DEFAULTS, k)) {
          fromUrl[k] = v
          hasUrl = true
        }
      })
    } catch (e) {
      fromUrl = {}
    }
    var base = {}
    try {
      base = JSON.parse(root.localStorage.getItem(KEY)) || {}
    } catch (e) {
      base = {} // 隐私模式或数据损坏时回退默认值
    }
    if (hasUrl) {
      /* 网址带参数 = 这是一张「指定的卷子」，卷子的参数全听网址的，
         本地存的那一份一概不叠加。但本机私有项（错字集开关）不属于卷子参数，
         留下来 —— 否则自己的 ?week=3 一刷新就把开关抹了。 */
      var keep = {}
      LOCAL_ONLY.forEach(function (k) {
        if (base[k] != null) keep[k] = base[k]
      })
      base = keep
    } else {
      /* 看哪张卷子不该被记住：打开页面永远回到「本周复习」这个主场景。
         想直达错字集，存一个带 ?mode=wrong 的链接即可。 */
      delete base.mode
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
        if (LOCAL_ONLY.indexOf(k) >= 0) return
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
    MODES: MODES,
    LOCAL_ONLY: LOCAL_ONLY,
    sanitize: sanitize,
    load: load,
    save: save
  }
})(typeof window !== 'undefined' ? window : globalThis)
