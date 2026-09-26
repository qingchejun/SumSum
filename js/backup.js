/**
 * 备份 / 搬家：把本站存在浏览器里的数据导出成一个文件，再在别的网址或别的电脑上导进去。
 *
 * 为什么需要：浏览器按网址分开存数据，站点从 sumsum-3nx.pages.dev 搬到 lianxizhi.pages.dev 后，
 * 识字的进度与错字集、奥数的「已学」都留在了旧网址上。换电脑、清缓存同理。
 *
 * 只搬 sumsum: 开头的键（全站的存储键都用这个前缀，名字沿用旧站名，改了会读不出老数据），
 * 但不搬 sumsum:help:seen —— 那是「这台浏览器有没有看过说明」，不是孩子的进度。
 *
 * 导入是「覆盖备份里有的，保留备份里没有的」，不做合并：错字集的合并规则（同一个字两边
 * 进度不同听谁的）说不清，而搬家场景里新网址上本来就是空的。
 *
 * 本文件无 DOM 依赖，node 下由 tools/check-backup.js 校验；页面上的按钮在 js/help.js。
 */
;(function (root) {
  'use strict'

  var APP = 'lianxizhi'
  var VERSION = 1
  var PREFIX = 'sumsum:'
  var SKIP = { 'sumsum:help:seen': true }
  var MAX_CHARS = 2 * 1024 * 1024 // 真实数据几十 KB；再大就不是我们导出的文件了

  function isObj(v) {
    return !!v && typeof v === 'object' && !Array.isArray(v)
  }

  function ours(k) {
    return typeof k === 'string' && k.indexOf(PREFIX) === 0 && !SKIP[k]
  }

  function collect(storage) {
    var data = {}
    for (var i = 0; i < storage.length; i++) {
      var k = storage.key(i)
      if (ours(k)) data[k] = storage.getItem(k)
    }
    return { app: APP, v: VERSION, at: new Date().toISOString(), data: data }
  }

  /* 返回 { ok: true, data } 或 { ok: false, error: 给家长看的一句话 }。一条不对就整份拒绝 */
  function parse(text) {
    var NOT_OURS = '这不是「练习纸」导出的备份文件。'
    if (typeof text !== 'string' || !text.trim()) return { ok: false, error: '文件是空的。' }
    if (text.length > MAX_CHARS) return { ok: false, error: '文件太大了，' + NOT_OURS }
    var pack
    try {
      pack = JSON.parse(text)
    } catch (e) {
      return { ok: false, error: NOT_OURS }
    }
    if (!isObj(pack) || pack.app !== APP) return { ok: false, error: NOT_OURS }
    if (pack.v !== VERSION) return { ok: false, error: '备份文件的版本不认识，请用同一个网站重新导出一次。' }
    if (!isObj(pack.data)) return { ok: false, error: '备份文件已损坏。' }
    var keys = Object.keys(pack.data)
    if (!keys.length) return { ok: false, error: '备份里没有任何数据。' }
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i]
      var v = pack.data[k]
      if (!ours(k) || typeof v !== 'string') return { ok: false, error: '备份文件已损坏或被改动过。' }
      try {
        JSON.parse(v)
      } catch (e) {
        return { ok: false, error: '备份文件已损坏或被改动过。' }
      }
    }
    return { ok: true, data: pack.data, at: typeof pack.at === 'string' ? pack.at : '' }
  }

  function apply(storage, data) {
    var n = 0
    Object.keys(data).forEach(function (k) {
      if (!ours(k)) return
      storage.setItem(k, data[k])
      n++
    })
    return n
  }

  function json(data, k) {
    try {
      return JSON.parse(data[k])
    } catch (e) {
      return null
    }
  }

  /* 导入前给家长确认用：备份里有什么，用人话列出来 */
  function describe(data) {
    var lines = []
    var wrong = json(data, 'sumsum:shizi:wrong:v2')
    if (isObj(wrong)) {
      /* 带 out 的是已移出的撤回墓碑，不算错字（见 shizi-mark 的 load） */
      var n = Object.keys(wrong).filter(function (ch) {
        return isObj(wrong[ch]) && !wrong[ch].out
      }).length
      lines.push('识字错字集：' + n + ' 个字')
    } else {
      var old = json(data, 'sumsum:shizi:wrong:v1')
      if (Array.isArray(old)) lines.push('识字错字集：' + old.length + ' 个字')
    }
    var shizi = json(data, 'sumsum:shizi:v1')
    if (isObj(shizi) && shizi.week) lines.push('识字进度：第 ' + shizi.week + ' 周')
    var learned = json(data, 'sumsum:aoshu:learned:v1')
    if (Array.isArray(learned)) lines.push('奥数「已学 ✓」：' + learned.length + ' 个知识点')
    var SETTINGS = {
      'sumsum:settings:v1': '口算',
      'sumsum:aoshu:v1': '奥数',
      'sumsum:shudu:v1': '数独',
      'sumsum:shizi:v1': '识字'
    }
    var mods = Object.keys(SETTINGS).filter(function (k) {
      return k in data
    }).map(function (k) {
      return SETTINGS[k]
    })
    if (mods.length) lines.push(mods.join('、') + '的设置')
    return lines
  }

  root.SumSum = root.SumSum || {}
  root.SumSum.backup = { collect: collect, parse: parse, apply: apply, describe: describe }
})(typeof window !== 'undefined' ? window : globalThis)
