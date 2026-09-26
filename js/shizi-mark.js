/**
 * 错字集：在预览的卷面上点字，把它加入 / 移出错字集。
 *
 * 【进来容易，出去难】：不认识的字点一下就收进来（红底）；
 * 要移出，得在【两个不同的日子】各认出来一次 —— 第一次点变半红，改天再认出来、再点一下才移出。
 * 同一天连点不算两次：今天点的，再点一下就是撤回。完整规则和理由见 shizi-core 的 markStep。
 *
 * 三种模式下点击规则完全一样，不做「在错字集页点表示认识了、在本周卷页点表示不认识」
 * 那种按页面区分的语义，否则每次都要先想自己在哪一页。
 * 移出之后的样子和从没标记过的字完全一样，所以屏幕上只有红底、半红两种标记。
 *
 * 【点击绝不触发重新渲染】—— 这是这个功能好不好用的分水岭。
 * shizi-main 的 refresh() 会把 #preview 的 innerHTML 整个换掉；若每点一次就 refresh，
 * 错字集页面上点掉一个字，网格立刻重新流动，下一个字跳到手指底下，必然误点。
 * 所以这里只改被点那一格的 class，卷面结构一动不动，什么时候重排由用户自己决定。
 *
 * 绑定方式抄 js/shudu-play.js：事件委托绑在【永不被替换的】#preview 上，只绑一次
 * （bind）；每次 render 之后把状态重新投影到新 DOM 上（paint）。字格上一个监听器都不绑。
 */
(function (root) {
  'use strict'

  var doc = root.document

  /*
   * 存储。命名沿用 sumsum:<板块>:<用途>:v1，与奥数的 sumsum:aoshu:learned:v1 同级。
   *
   * 【绝不能并进 settings】：shizi-settings 的 save() 会把非默认项写进网址，
   * 错字集进去等于把孩子的个人进度塞进分享链接，语义全错，几百个汉字也会让网址没法看。
   *
   * 【存汉字本身，不存字表下标】：每周字数是可改的，下标会随之漂移
   *（remapWeek 那套换算就是在处理这个问题），汉字则天然稳定。
   */
  var KEY = 'sumsum:shizi:wrong:v2'
  /* v1 只存了一个字的数组，没有「哪天认出过」这回事。读进来当作「很早以前加的红底字」，
     add 给空串 —— 比任何日期都小，所以今天就能记一次认出。v1 那一项留着不删，不碍事。 */
  var KEY_V1 = 'sumsum:shizi:wrong:v1'

  function isObj(v) {
    return !!v && typeof v === 'object' && !Array.isArray(v)
  }

  /* 本地日期。toISOString 是 UTC，北京时间早上 8 点前会算成前一天，所以自己拼 */
  function today() {
    var d = new Date()
    var p = function (n) {
      return (n < 10 ? '0' : '') + n
    }
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate())
  }

  function load() {
    var map = {}
    try {
      var raw = JSON.parse(root.localStorage.getItem(KEY))
      if (isObj(raw)) {
        var t = today()
        Object.keys(raw).forEach(function (ch) {
          var e = raw[ch]
          if (!isObj(e) || typeof e.add !== 'string') return // 被人手改坏的条目
          if (e.out && e.out !== t) return // 以前移出的，撤回期已过
          map[ch] = e
        })
        return map
      }
      var old = JSON.parse(root.localStorage.getItem(KEY_V1))
      if (Array.isArray(old)) {
        old.forEach(function (ch) {
          if (typeof ch === 'string' && ch) map[ch] = { add: '' }
        })
      }
    } catch (e) {
      /* 隐私模式或数据损坏时当作空集 */
    }
    return map
  }

  function save() {
    try {
      root.localStorage.setItem(KEY, JSON.stringify(marks))
    } catch (e) {
      /* 隐私模式下写入失败可忽略 */
    }
  }

  var marks = load()
  var listeners = []

  function fire() {
    listeners.forEach(function (fn) {
      fn(size())
    })
  }

  function stateOf(ch) {
    return root.SumSum.shizi.markState(marks[ch])
  }

  /* 「在错字集里」= 红底或半红。当天刚移出、还能撤回的不算 */
  function has(ch) {
    return stateOf(ch) !== 'out'
  }

  function members() {
    return Object.keys(marks).filter(has)
  }

  function size() {
    return members().length
  }

  /* 其中认出过一次、再认出一次就能移出的 */
  function onceCount() {
    return members().filter(function (ch) {
      return stateOf(ch) === 'once'
    }).length
  }

  /* 按字表顺序排好的错字数组。排序逻辑在 shizi-core（纯函数，node 里测得动） */
  function all() {
    return root.SumSum.shizi.sortByTable(members())
  }

  /* 点一下：按 markStep 走一步，返回这个字的新状态 'wrong' | 'once' | 'out' */
  function step(ch) {
    if (!ch) return 'out'
    var next = root.SumSum.shizi.markStep(marks[ch], today())
    if (next) marks[ch] = next
    else delete marks[ch]
    save()
    fire()
    return stateOf(ch)
  }

  function clear() {
    marks = {}
    save()
    fire()
  }

  function onChange(fn) {
    listeners.push(fn)
  }

  /*
   * 把集合投影到当前 DOM 上。每次 render 之后调一次（见 shizi-main 的 refresh），
   * 位置对应数独 shudu-main.js 里 render() 紧跟 attach() 的那两行。
   * 全量重刷、不做增量：一页最多两百来个格子，重算一遍 class 是微秒级，
   * 而增量更新要维护「上次是什么状态」，是 bug 的温床。
   */
  function paintCell(cell, st) {
    cell.classList.toggle('is-wrong', st !== 'out')
    cell.classList.toggle('is-once', st === 'once')
  }

  function paint() {
    var cells = doc.querySelectorAll('#preview .shizi-cell')
    for (var i = 0; i < cells.length; i++) {
      paintCell(cells[i], stateOf(cells[i].dataset.ch))
    }
  }

  /*
   * 只调一次。#preview 的内容会反复重渲染，但容器本身不换，所以委托绑在它上面。
   *
   * 同一个字在一页上只会出现一次，但整表核对是 9 页连排、一个字仍然只出现一次；
   * 真正需要多格同步的情况是「打印份数 = 2」时同一页连印两张 —— 那两张上的同一个字
   * 必须一起变色，否则用户会以为没点上。所以这里按 data-ch 全量同步，而不是只改被点的那一格。
   */
  function bind() {
    var preview = doc.getElementById('preview')
    if (!preview) return
    preview.addEventListener('click', function (ev) {
      var cell = ev.target.closest ? ev.target.closest('.shizi-cell') : null
      if (!cell || !preview.contains(cell)) return
      var ch = cell.dataset.ch
      if (!ch) return
      var st = step(ch)
      var same = preview.querySelectorAll('.shizi-cell[data-ch="' + ch.replace(/"/g, '\\"') + '"]')
      for (var i = 0; i < same.length; i++) {
        paintCell(same[i], st)
      }
    })
  }

  root.SumSum = root.SumSum || {}
  root.SumSum.shiziMark = {
    bind: bind,
    paint: paint,
    onChange: onChange,
    has: has,
    size: size,
    onceCount: onceCount,
    all: all,
    step: step,
    clear: clear
  }
})(typeof window !== 'undefined' ? window : globalThis)
