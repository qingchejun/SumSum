/**
 * 错字集：在预览的卷面上点字，把它加入 / 移出错字集。
 *
 * 【进来容易，出去难】：不认识的字点一下就收进来（红底）；
 * 要移出，得在【两个不同的日子】各认出来一次 —— 第一次点变半红，改天再认出来、再点一下才移出。
 * 同一天连点不算两次：今天点的，再点一下就是撤回。完整规则和理由见 shizi-core 的 markStep。
 * 每个字还记着【累计错过几次】，移出、清空都不清零；错过 2 次以上的在左上角标「×n」。
 * 错字集和累计记录（历史错字集）是同一份数据，见 markStep 的说明。
 *
 * 【复习结算】：点了的字是认出来的，没点的字系统分不出是「又不认识」还是「这次没复习」，
 * 所以复习完由家长点「结算」：卷面上还在错字集里、今天没动过的字算又错一次（markMiss），
 * 半红的退回红底 —— 移出要连续两次复习都认出。当天可以撤销。每次结算记一行复习记录（LOG_KEY），
 * 「历史」页签里看。
 *
 * 两种模式下点击规则完全一样，不做「在错字集页点表示认识了、在本周卷页点表示不认识」
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
        Object.keys(raw).forEach(function (ch) {
          var e = raw[ch]
          /* 被人手改坏的条目丢掉。已经移出的【留着】—— 累计次数就记在它们身上，
             见 shizi-core 的 markStep。在集里的必有 add，早就移出的至少有 out */
          if (!isObj(e) || (typeof e.add !== 'string' && typeof e.out !== 'string')) return
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

  /*
   * 复习记录：每次结算记一行，一天一行（同一天结算几次合并）。
   *   { d: 日期, seen: '复习到的旧错字', ok: 认出几个, miss: 又错几个, out: 学会移出几个 }
   * 当天这一行在之后点字、撤销时跟着重算（见 refreshLog）；过了这一天就定格。
   * 只留最近 LOG_MAX 天，够看趋势，不会越攒越大。
   */
  var LOG_KEY = 'sumsum:shizi:log:v1'
  var LOG_MAX = 120

  function loadLog() {
    try {
      var raw = JSON.parse(root.localStorage.getItem(LOG_KEY))
      return Array.isArray(raw) ? raw.filter(function (r) {
        return isObj(r) && typeof r.d === 'string' && typeof r.seen === 'string'
      }) : []
    } catch (e) {
      return []
    }
  }

  var log = loadLog()

  function saveLog() {
    try {
      root.localStorage.setItem(LOG_KEY, JSON.stringify(log.slice(-LOG_MAX)))
    } catch (e) {
      /* 隐私模式下写入失败可忽略 */
    }
  }

  /* 今天那一行的数字按当前记录重算：结算后又点了漏点的字、撤销了结算，都要反映出来 */
  function refreshLog() {
    var t = today()
    var row = log.length && log[log.length - 1].d === t ? log[log.length - 1] : null
    if (!row) return
    var ok = 0
    var miss = 0
    var out = 0
    Array.from(row.seen).forEach(function (ch) {
      var e = marks[ch]
      if (!e) return
      if (e.miss === t && e.missWas && stateOf(ch) !== 'out') miss++
      else if (e.out === t) out++
      else if (e.hit === t) ok++
    })
    row.ok = ok + out
    row.miss = miss
    row.out = out
    saveLog()
  }

  function fire() {
    refreshLog()
    listeners.forEach(function (fn) {
      fn(size())
    })
  }

  function stateOf(ch) {
    return root.SumSum.shizi.markState(marks[ch])
  }

  /* 「在错字集里」= 右上角标着 2 或 1 的。移出了的（只剩累计次数的）不算 */
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

  /* 累计进过几次错字集，移出了也算。从没进过是 0 */
  function countOf(ch) {
    return root.SumSum.shizi.markCount(marks[ch])
  }

  /*
   * 反复错的字：累计进过 2 次以上的，不管现在在不在集里。
   * 次数多的排前面；次数一样的按字表顺序，免得每次打开顺序都在变。
   */
  var REPEAT_MIN = 2
  function repeats() {
    var chars = root.SumSum.shizi.sortByTable(Object.keys(marks).filter(function (ch) {
      return countOf(ch) >= REPEAT_MIN
    }))
    var rank = {}
    chars.forEach(function (ch, i) {
      rank[ch] = i
    })
    return chars
      .sort(function (a, b) {
        return countOf(b) - countOf(a) || rank[a] - rank[b]
      })
      .map(function (ch) {
        return { ch: ch, n: countOf(ch), on: has(ch) }
      })
  }

  /*
   * 卷面上这些字里，哪些是「这次复习到的旧错字」：在错字集里、或今天刚认出移出的，
   * 但不含今天才收进来的（那是本周卷上新发现的，不是复习旧账）。
   */
  function reviewed(chars) {
    var t = today()
    var seen = {}
    return chars.filter(function (ch) {
      var e = marks[ch]
      if (!e || seen[ch]) return false
      seen[ch] = true
      if (e.add === t) return false
      return stateOf(ch) !== 'out' || e.out === t
    })
  }

  /* 结算会把哪些字算成又错一次 */
  function pending(chars) {
    var t = today()
    return reviewed(chars).filter(function (ch) {
      return root.SumSum.shizi.markMiss(marks[ch], t) !== marks[ch]
    })
  }

  /* 今天已经结算成「又错一次」的字（不限卷面），撤销按钮用 */
  function missedToday() {
    var t = today()
    return Object.keys(marks).filter(function (ch) {
      var e = marks[ch]
      return e.miss === t && e.missWas && stateOf(ch) !== 'out'
    })
  }

  /* 结算：卷面上的字传进来，没点的算又错一次，并记一行复习记录 */
  function settle(chars) {
    var t = today()
    var seen = reviewed(chars)
    if (!seen.length) return
    seen.forEach(function (ch) {
      marks[ch] = root.SumSum.shizi.markMiss(marks[ch], t)
    })
    var row = log.length && log[log.length - 1].d === t ? log[log.length - 1] : null
    if (!row) {
      row = { d: t, seen: '' }
      log.push(row)
    }
    seen.forEach(function (ch) {
      if (row.seen.indexOf(ch) < 0) row.seen += ch
    })
    save()
    fire() // fire 里 refreshLog 算出今天这一行的数字
  }

  /* 撤销今天的结算：次数退回、半红的回到半红；今天那一行复习记录删掉 */
  function unsettle() {
    var t = today()
    Object.keys(marks).forEach(function (ch) {
      marks[ch] = root.SumSum.shizi.markUnmiss(marks[ch], t)
    })
    if (log.length && log[log.length - 1].d === t) log.pop()
    save()
    saveLog()
    fire()
  }

  function todayLog() {
    var t = today()
    return log.length && log[log.length - 1].d === t ? log[log.length - 1] : null
  }

  /* 最近的复习记录，新的在前 */
  function history() {
    return {
      stats: root.SumSum.shizi.historyStats(marks),
      log: log.slice().reverse()
    }
  }

  /* 附页抽字的权重：错得越多越容易抽到，规则在 shizi-core 的 reviewWeight */
  function weightOf(ch) {
    return root.SumSum.shizi.reviewWeight(marks[ch])
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

  /* 清空的是【错字集】，不是历史：在集里的字一律当作今天移出，累计次数留着 */
  function clear() {
    var t = today()
    Object.keys(marks).forEach(function (ch) {
      marks[ch] = root.SumSum.shizi.markClear(marks[ch], t)
    })
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
  /* 左上角的「×3」靠 data-n + CSS 画，只有累计 2 次以上才有 */
  function paintCell(cell, st, n) {
    cell.classList.toggle('is-wrong', st !== 'out')
    cell.classList.toggle('is-once', st === 'once')
    if (n >= REPEAT_MIN) cell.dataset.n = n
    else delete cell.dataset.n
  }

  function paint() {
    var cells = doc.querySelectorAll('#preview .shizi-cell')
    for (var i = 0; i < cells.length; i++) {
      var ch = cells[i].dataset.ch
      paintCell(cells[i], stateOf(ch), countOf(ch))
    }
  }

  /*
   * 只调一次。#preview 的内容会反复重渲染，但容器本身不换，所以委托绑在它上面。
   *
   * 同一个字在一页上只会出现一次；真正需要多格同步的情况是「打印份数 = 2」时同一页连印两张 —— 那两张上的同一个字
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
      var n = countOf(ch)
      var same = preview.querySelectorAll('.shizi-cell[data-ch="' + ch.replace(/"/g, '\\"') + '"]')
      for (var i = 0; i < same.length; i++) {
        paintCell(same[i], st, n)
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
    countOf: countOf,
    repeats: repeats,
    all: all,
    step: step,
    clear: clear,
    reviewed: reviewed,
    pending: pending,
    missedToday: missedToday,
    settle: settle,
    unsettle: unsettle,
    todayLog: todayLog,
    history: history,
    weightOf: weightOf
  }
})(typeof window !== 'undefined' ? window : globalThis)
