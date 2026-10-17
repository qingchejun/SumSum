/**
 * 识字板块校验脚本。用法：node tools/check-shizi.js
 *
 * 项目没有测试框架也没有 package.json，所以这是一个能用 node 直接跑的独立脚本。
 * js/shizi-*.js 都是无 DOM 依赖的 IIFE，尾部挂在 globalThis 上，require 进来即可。
 *
 * 【重要】这里的切分与排版计算是【独立于 js/shizi-core.js、js/shizi-render.js
 * 另写一遍的】，故意不复用那边的 sliceOf / layout。两套独立实现互为对照，
 * 才抓得住「实现和校验犯同一个错」这种查不出来的情况（这条规矩来自 check-shudu.js）。
 *
 * 这个板块最要命的风险不是算法，而是【字表本身是人肉照着截图转录的】。
 * 所以第一组检查全是冲着转录错误去的：结构、总数、重复、非汉字。
 * 但要清楚它的边界 —— 把「未」认成「末」这种，两个都是合法汉字、都不重复，
 * 脚本一定抓不住，只能拿原图逐屏人工对（页面上原有的「整表核对」已于 2026-09 下架，
 * 字表已核对完毕）。
 */
'use strict'

require('../js/shizi-data.js')
require('../js/shizi-core.js')
require('../js/shizi-settings.js') // 只为验 sanitize 的钳位；load/save 碰 DOM，这里不调
globalThis.SumSum.render = { parts: {} } // shizi-render 在模块顶层不碰 DOM，但留个壳更保险
require('../js/shizi-render.js')

var D = globalThis.SumSum.shiziData
var Z = globalThis.SumSum.shizi
var T = globalThis.SumSum.shiziSettings
var R = globalThis.SumSum.shiziRender

var problems = []
function bad(msg) {
  problems.push(msg)
}

/* 原图的结构在这里【重新写一遍】，不从 shiziData 取它自己的 COLS/ROWS ——
   那边写错了这里才能发现。9 张截图，每张 15 列 × 12 行。 */
var SCREENS = 9
var COLS = 15
var ROWS = 12
var RAW_TOTAL = SCREENS * COLS * ROWS // 1620
var POOL = 1600 // 纳入复习的字数，与 shizi-core 的 TOTAL 对照

/* ---------- 1. 字表结构与转录质量 ---------- */

function checkTable() {
  if (D.SCREENS.length !== SCREENS) {
    bad('字表应有 ' + SCREENS + ' 屏，实际 ' + D.SCREENS.length + ' 屏')
  }
  D.SCREENS.forEach(function (screen, si) {
    if (screen.length !== ROWS) {
      bad('第 ' + (si + 1) + ' 屏应有 ' + ROWS + ' 行，实际 ' + screen.length + ' 行')
    }
    screen.forEach(function (line, ri) {
      var n = Array.from(line).length
      if (n !== COLS) {
        bad('第 ' + (si + 1) + ' 屏第 ' + (ri + 1) + ' 行应有 ' + COLS + ' 字，实际 ' + n + ' 字：' + line)
      }
    })
  })

  /* 独立地把字表再拍平一遍，和 shizi-data 自己导出的 LIST 对照 */
  var flat = []
  D.SCREENS.forEach(function (screen) {
    screen.forEach(function (line) {
      Array.prototype.push.apply(flat, Array.from(line))
    })
  })
  if (flat.length !== RAW_TOTAL) {
    bad('字表总数应为 ' + RAW_TOTAL + '，实际 ' + flat.length)
  }
  if (flat.join('') !== D.LIST.join('')) {
    bad('shizi-data 导出的 LIST 与按屏拍平的结果不一致')
  }

  /* 重复字。一个字重复出现，多半是转录时把某一行抄了两遍或看串了行 ——
     报出位置（第几屏第几行第几个）才好拿原图去对。 */
  var seen = {}
  flat.forEach(function (ch, i) {
    if (seen[ch] != null) {
      bad('「' + ch + '」重复：' + where(seen[ch]) + ' 与 ' + where(i))
    } else {
      seen[ch] = i
    }
  })

  flat.forEach(function (ch, i) {
    if (!/^[一-龥]$/.test(ch)) {
      bad('非汉字或多字符「' + ch + '」出现在 ' + where(i))
    }
  })
}

/* 把 0 起的全局下标翻译成「第几屏第几行第几个」，好拿原图核对 */
function where(i) {
  var s = Math.floor(i / (COLS * ROWS))
  var rest = i % (COLS * ROWS)
  return '第' + (s + 1) + '屏第' + (Math.floor(rest / COLS) + 1) + '行第' + ((rest % COLS) + 1) + '个（第 ' + (i + 1) + ' 字）'
}

/* ---------- 2. 周次切分 ---------- */

function checkSlices() {
  if (Z.TOTAL !== POOL) bad('shizi-core 的 TOTAL 应为 ' + POOL + '，实际 ' + Z.TOTAL)
  if (Z.poolSize() !== POOL) bad('复习字池应为 ' + POOL + ' 字，实际 ' + Z.poolSize())

  /* 每周字数从 10 到 200 全扫一遍：用户能在面板上填任意一个，
     任意一个都得保证「所有周拼起来 = 完整字池，不重不漏」。 */
  for (var per = 10; per <= 200; per++) {
    var expectWeeks = Math.ceil(POOL / per)
    if (Z.totalWeeks(per) !== expectWeeks) {
      bad('每周 ' + per + ' 字应为 ' + expectWeeks + ' 周，实际 ' + Z.totalWeeks(per))
      continue
    }
    var joined = []
    for (var w = 1; w <= expectWeeks; w++) {
      var sl = Z.sliceOf(w, per)
      if (sl.week !== w) bad('每周 ' + per + ' 字、第 ' + w + ' 周返回的 week 是 ' + sl.week)
      if (sl.from !== joined.length + 1) {
        bad('每周 ' + per + ' 字、第 ' + w + ' 周的起始序号应为 ' + (joined.length + 1) + '，实际 ' + sl.from)
      }
      if (sl.to !== joined.length + sl.chars.length) {
        bad('每周 ' + per + ' 字、第 ' + w + ' 周的结束序号对不上')
      }
      /* 除最后一周外，每周都必须是满的 */
      if (w < expectWeeks && sl.chars.length !== per) {
        bad('每周 ' + per + ' 字、第 ' + w + ' 周只有 ' + sl.chars.length + ' 字')
      }
      if (!sl.chars.length) bad('每周 ' + per + ' 字、第 ' + w + ' 周是空的')
      Array.prototype.push.apply(joined, sl.chars)
    }
    if (joined.join('') !== D.LIST.slice(0, POOL).join('')) {
      bad('每周 ' + per + ' 字：各周拼起来与字池不一致（有遗漏、重叠或错序）')
    }
  }

  /* 越界的周次必须被钳回来，不能返回空卷子 */
  ;[0, -1, -999, 17, 999, NaN, null, undefined, ''].forEach(function (w) {
    var sl = Z.sliceOf(w, 100)
    if (sl.week < 1 || sl.week > 16 || !sl.chars.length) {
      bad('周次 ' + JSON.stringify(w) + ' 没被正确钳位：week=' + sl.week + '、' + sl.chars.length + ' 字')
    }
  })

  /* 首尾两个字直接写死在这里对一次：整个板块所有下标计算的锚点 */
  var first = Z.sliceOf(1, 100)
  var last = Z.sliceOf(16, 100)
  if (first.chars[0] !== '一') bad('第 1 周第 1 个字应为「一」，实际「' + first.chars[0] + '」')
  if (first.from !== 1 || first.to !== 100) bad('第 1 周应为第 1–100 字')
  if (last.from !== 1501 || last.to !== 1600) bad('第 16 周应为第 1501–1600 字')
  if (last.chars[last.chars.length - 1] !== D.LIST[POOL - 1]) {
    bad('第 16 周最后一个字与字表第 ' + POOL + ' 字对不上')
  }
}

/* ---------- 3. 排版 ---------- */

/* 版心在这里重写一遍，与 shizi-render 的 MM 对照 */
var FIT_W = 178
var FIT_H = 222
var GLYPH_MIN = 6
var CELL_MAX = 30 // 格子上限，与 shizi-render 的 MM.cellMax 对照
var FONT_RATIO = 0.6

function checkLayout() {
  if (R.MM.fitW !== FIT_W || R.MM.fitH !== FIT_H) {
    bad('版心应为 ' + FIT_W + '×' + FIT_H + 'mm，实际 ' + R.MM.fitW + '×' + R.MM.fitH)
  }
  if (R.MM.cellMax !== CELL_MAX) bad('格子上限应为 ' + CELL_MAX + 'mm，实际 ' + R.MM.cellMax)
  if (R.MM.fontRatio !== FONT_RATIO) bad('字号比例应为 ' + FONT_RATIO + '，实际 ' + R.MM.fontRatio)

  /* 从 10 到 200 每个字数都验一遍：每周字数是用户能随手改的 */
  for (var n = 10; n <= 200; n++) {
    var lay = R.layout(n)
    if (!lay) {
      bad(n + ' 字排不出版面')
      continue
    }
    /* 独立复算，不信 layout 自己报的数 */
    var rows = Math.ceil(n / lay.cols)
    if (rows !== lay.rows) bad(n + ' 字：行数应为 ' + rows + '，实际 ' + lay.rows)
    /* 格子先按版心等分，再各自封到 CELL_MAX —— 独立复算一遍封顶逻辑 */
    var w = Math.min(FIT_W / lay.cols, CELL_MAX)
    var h = Math.min(FIT_H / rows, CELL_MAX)
    if (Math.abs(w - lay.w) > 1e-9 || Math.abs(h - lay.h) > 1e-9) {
      bad(n + ' 字：格子尺寸对不上')
    }
    /* 关键红线：渲染时内联的 mm 是向下取整的，所以实际占用只会更小；
       这里按未取整的值验，够严。 */
    if (lay.cols * w > FIT_W + 1e-9) bad(n + ' 字：占宽 ' + (lay.cols * w) + ' 超出 ' + FIT_W)
    if (rows * h > FIT_H + 1e-9) bad(n + ' 字：占高 ' + (rows * h) + ' 超出 ' + FIT_H)
    if (lay.glyph < GLYPH_MIN) bad(n + ' 字：字号 ' + lay.glyph + 'mm 低于下限 ' + GLYPH_MIN)
    /* 上限同样是红线：末周只剩一两个字时，不封顶会整页印一个 10cm 的大字 */
    if (lay.glyph > CELL_MAX * FONT_RATIO + 1e-9) {
      bad(n + ' 字：字号 ' + lay.glyph + 'mm 超出上限 ' + CELL_MAX * FONT_RATIO)
    }
    if (lay.w > CELL_MAX + 1e-9 || lay.h > CELL_MAX + 1e-9) {
      bad(n + ' 字：格子 ' + lay.w + '×' + lay.h + 'mm 超出上限 ' + CELL_MAX)
    }
    if (lay.cols * lay.rows < n) bad(n + ' 字：' + lay.cols + '×' + lay.rows + ' 格子不够放')
    /* 末行不能太空（见 shizi-render 的 lastRowMin） */
    var last = n - (rows - 1) * lay.cols
    if (last / lay.cols < R.MM.lastRowMin - 1e-9) {
      bad(n + ' 字：末行只有 ' + last + '/' + lay.cols + '，太空')
    }
  }

  /* 100 字必须是一页、10×10 —— 这是整个板块的立身场景，写死验它 */
  var per = R.perPageOf({ perPage: 0 }, 100)
  if (per !== 100) bad('100 字应当排进一页，实际每页 ' + per + ' 字')
  var lay100 = R.layout(100)
  if (lay100.cols !== 10 || lay100.rows !== 10) {
    bad('100 字应排成 10 列 × 10 行，实际 ' + lay100.cols + '×' + lay100.rows)
  }
  if (lay100.glyph < 10) bad('100 字时每个字应不小于 10mm，实际 ' + lay100.glyph)

  /* 一页放不下时必须分页，而且每页均分 */
  var big = R.autoPer(400)
  if (big >= 400) bad('400 字应当分页，实际每页 ' + big)
  if (Math.ceil(400 / big) * big - 400 >= big) bad('400 字分页不均：每页 ' + big)
}

/*
 * 把面板上能点出来的每一种组合都真跑一遍：每周字数 10~200 × 该设置下的每一周 ×
 * 「每页字数」下拉里的每个选项，看 layout() 会不会落空。
 * 落空意味着 shizi-render 里那条 `layout(per) || layout(per, …)` 的兜底真的会被走到 ——
 * 那条分支目前是死代码，一旦这里报错就说明它活了，得回去确认兜底出来的版面能不能看。
 * 两万多个组合，跑完只要几十毫秒。
 */
/* 直接用 settings 导出的白名单，不再在这里抄第二份 —— 抄两份迟早写歪。
   它与 shizi.html 里 #f-perpage 的 <option> 一一对应，见 shizi-settings 的注释。 */
var PER_PAGE_OPTIONS = T.PER_PAGE

function checkAllCombos() {
  var combos = 0
  var worst = Infinity
  var worstAt = ''
  for (var pw = 10; pw <= 200; pw++) {
    for (var w = 1; w <= Z.totalWeeks(pw); w++) {
      var chars = Z.sliceOf(w, pw).chars.length
      for (var i = 0; i < PER_PAGE_OPTIONS.length; i++) {
        var s = T.sanitize({ week: w, perWeek: pw, perPage: PER_PAGE_OPTIONS[i] })
        var per = R.perPageOf(s, chars)
        var lay = R.layout(per)
        combos++
        if (!lay) {
          bad('每周 ' + pw + ' 字、第 ' + w + ' 周、每页 ' + PER_PAGE_OPTIONS[i] + ' 字：排不出版面（per=' + per + '）')
          continue
        }
        if (lay.cols * lay.rows < per) {
          bad('每周 ' + pw + ' 字、每页 ' + PER_PAGE_OPTIONS[i] + ' 字：' + lay.cols + '×' + lay.rows + ' 放不下 ' + per + ' 个')
        }
        if (lay.glyph < worst) {
          worst = lay.glyph
          worstAt = '每周 ' + pw + ' 字 / 每页 ' + PER_PAGE_OPTIONS[i] + ' 字 / 一页 ' + per + ' 个'
        }
      }
    }
  }
  if (worst < GLYPH_MIN) bad('最小字号 ' + worst + 'mm 跌破下限（' + worstAt + '）')
  console.log('   ' + combos + ' 种组合，最小字号 ' + (Math.floor(worst * 10) / 10) + 'mm（' + worstAt + '）')
}

/* ---------- 4. 换每周字数时周次要跟着搬 ---------- */

/*
 * 这是本板块唯一会【静默丢数据】的地方，所以单独一组。
 *
 * week 存的是序数不是字序。改每周字数时若只做越界钳位、不做换算，
 * 第 16 周（每周 100 字 = 第 1501–1600 字）改成每周 50 字后仍是第 16 周，
 * 指向的却是第 751–800 字 —— 进度倒退 750 个字，而 refresh() 第一句就存盘了。
 *
 * 要验的不变量：换算后那一周，必须仍然【包含换算前那一周的起始字】。
 * 这里独立算起始字序（(week-1)*perWeek+1），不复用 remapWeek 自己的公式。
 */
function checkRemap() {
  function assertHolds(pwFrom, week, pwTo) {
    var from = (week - 1) * pwFrom + 1 // 独立算：换算前这一周从第几个字开始
    if (from > POOL) return // 越界的周次不在讨论范围，clampWeek 另有一组在验
    var w2 = Z.remapWeek(week, pwFrom, pwTo)
    var sl = Z.sliceOf(w2, pwTo)
    if (from < sl.from || from > sl.to) {
      bad('每周 ' + pwFrom + '→' + pwTo + ' 字：第 ' + week + ' 周（起于第 ' + from +
        ' 字）换算成第 ' + w2 + ' 周（第 ' + sl.from + '–' + sl.to + ' 字），没包住原来的位置')
    }
    if (w2 < 1 || w2 > Z.totalWeeks(pwTo)) {
      bad('每周 ' + pwFrom + '→' + pwTo + ' 字：换算出的第 ' + w2 + ' 周越界')
    }
  }

  /* 面板上能填的每一对「每周字数」，各取首周 / 中间某周 / 末周 */
  for (var a = 10; a <= 200; a++) {
    var lastA = Z.totalWeeks(a)
    for (var b = 10; b <= 200; b++) {
      assertHolds(a, 1, b)
      assertHolds(a, Math.max(1, Math.ceil(lastA / 2)), b)
      assertHolds(a, lastA, b)
    }
  }

  /* 下拉框里那几个常用值，逐周全扫 */
  var common = [25, 50, 60, 100, 200]
  common.forEach(function (a) {
    common.forEach(function (b) {
      for (var w = 1; w <= Z.totalWeeks(a); w++) assertHolds(a, w, b)
    })
  })

  /* 换过去再换回来，必须回到原来那一周（起始字序没变，就该是同一周） */
  for (var w2 = 1; w2 <= 16; w2++) {
    var there = Z.remapWeek(w2, 100, 50)
    var back = Z.remapWeek(there, 50, 100)
    if (back !== w2) bad('第 ' + w2 + ' 周：100→50→100 字换算回来成了第 ' + back + ' 周')
  }

  /* 把审查里那个具体的例子写死验一次，免得将来公式被改回去 */
  var fixed = Z.remapWeek(16, 100, 50)
  if (Z.sliceOf(fixed, 50).from !== 1501) {
    bad('第 16 周（第 1501 字起）改成每周 50 字后应从第 1501 字起，实际第 ' + Z.sliceOf(fixed, 50).from + ' 字')
  }
}

/* ---------- 5. 错字集：排序与卷面 ---------- */

/*
 * 错字集本身（增删、localStorage、点击）在 js/shizi-mark.js 里，那一层依赖 DOM，
 * node 跑不动，也就测不了 —— 和数独的 shudu-play.js 一样。
 * 但排序是纯函数、放在 core 里，这里能测；而错字卷的排版走的就是普通字数那一套，
 * 上面的 checkLayout 已经扫过 10~200 字，这里只补错字集特有的边界。
 */
function checkWrongSet() {
  var pool = Z.pool()

  /* 排序：按字表下标升序 */
  var shuffled = [pool[500], pool[3], pool[1200], pool[0], pool[77]]
  var sorted = Z.sortByTable(shuffled)
  var idx = sorted.map(function (ch) {
    return D.LIST.indexOf(ch)
  })
  for (var i = 1; i < idx.length; i++) {
    if (idx[i] <= idx[i - 1]) bad('sortByTable 没有按字表顺序排：' + sorted.join(''))
  }

  /* 去重 */
  var dup = Z.sortByTable([pool[10], pool[2], pool[10], pool[2], pool[2]])
  if (dup.length !== 2) bad('sortByTable 应当去重，实际返回 ' + dup.length + ' 个')

  /* 字表外的字要排最后、且一个都不能丢（保持录入顺序） */
  var mixed = Z.sortByTable(['〇', pool[5], '㐀', pool[1]])
  if (mixed.length !== 4) bad('sortByTable 把表外的字弄丢了：' + mixed.join(''))
  if (mixed[0] !== pool[1] || mixed[1] !== pool[5]) bad('sortByTable：表内的字应排在前面')
  if (mixed[2] !== '〇' || mixed[3] !== '㐀') bad('sortByTable：表外的字应排最后并保持原序')

  /* 空输入不能炸 */
  ;[[], null, undefined].forEach(function (v) {
    var out = Z.sortByTable(v)
    if (!Array.isArray(out) || out.length) bad('sortByTable(' + JSON.stringify(v) + ') 应返回空数组')
  })

  /* 错字卷的排版。错字数是完全不可控的（家长点几个就是几个），
     所以从 1 个字扫到 400 个字，每一种都得排得出、不越界。 */
  for (var n = 1; n <= 400; n++) {
    var per = R.perPageOf({ perPage: 0 }, n)
    var lay = R.layout(per)
    if (!lay) {
      bad('错字卷 ' + n + ' 字：排不出版面（per=' + per + '）')
      continue
    }
    if (lay.cols * lay.w > FIT_W + 1e-9 || lay.rows * lay.h > FIT_H + 1e-9) {
      bad('错字卷 ' + n + ' 字：占位超出版心')
    }
    if (lay.glyph < GLYPH_MIN - 1e-9 || lay.glyph > CELL_MAX * FONT_RATIO + 1e-9) {
      bad('错字卷 ' + n + ' 字：字号 ' + lay.glyph + 'mm 越界')
    }
    if (Math.ceil(n / per) < 1) bad('错字卷 ' + n + ' 字：页数算成了 0')
  }
}

/* 比较记录时不看键的先后（{a,b} 和 {b,a} 是同一条记录） */
function canon(v) {
  if (Array.isArray(v)) return '[' + v.map(canon).join(',') + ']'
  if (v && typeof v === 'object') {
    return '{' + Object.keys(v).filter(function (k) { return v[k] !== undefined }).sort().map(function (k) {
      return JSON.stringify(k) + ':' + canon(v[k])
    }).join(',') + '}'
  }
  return JSON.stringify(v)
}

/* ---------- 5b. 错字的进出规则与累计次数（markStep / markClear） ---------- */

/*
 * 进错字集点一下；出错字集要【在两个不同的日子】各认出来一次。
 * 当天点的，再点一下是撤回 —— 手一滑点错了，不能留下改不掉的痕迹。
 * 每个字另记一个累计次数 n：一共进过几次错字集。移出不清零，再进来加一；
 * 当天误点撤回的那一次不算。这里把每一种状态、每一种「今天 / 以前」的组合都走一遍。
 */
function checkMarkStep() {
  var D1 = '2026-09-20'
  var D2 = '2026-09-21'
  var D3 = '2026-09-22'
  var D4 = '2026-09-23'
  var step = Z.markStep
  var state = Z.markState
  var count = Z.markCount
  function eq(a, b, msg) {
    if (canon(a) !== canon(b)) {
      bad('markStep ' + msg + '：期望 ' + JSON.stringify(b) + '，实际 ' + JSON.stringify(a))
    }
  }

  /* 主线：第一天进，第二天认出一次，第三天再认出 → 移出，但累计次数留着 */
  var e = step(null, D1)
  eq(e, { add: D1, n: 1, first: D1 }, '不在集里点一下应当加进来，记第 1 次，并记下第一次错的日子')
  eq(state(e), 'wrong', '刚加进来应是 2')
  e = step(e, D2)
  eq(e, { add: D1, hit: D2, n: 1, first: D1 }, '隔天认出应记一次，first 跟着走')
  eq(state(e), 'once', '认出一次应是 1')
  e = step(e, D3)
  eq(state(e), 'out', '另一天再认出应当移出')
  eq(count(e), 1, '移出后累计次数不应清零')
  eq(e.first, D1, '移出后 first 不应丢')

  /* 移出之后隔天又错 → 第 2 次进来，当天撤回 → 回到「移出、1 次」 */
  var again = step(e, D4)
  eq(state(again), 'wrong', '移出的字隔天再点应重新进来')
  eq(count(again), 2, '再进来应记第 2 次')
  eq(again.first, D1, '再进来 first 仍是第一次错的日子')
  var undo = step(again, D4)
  eq(state(undo), 'out', '当天再进来又撤回，应回到移出')
  eq(count(undo), 1, '撤回的那一次不应算进累计')
  eq(state(step(undo, D4)), 'wrong', '撤回之后当天还能再加进来')
  eq(count(step(undo, D4)), 2, '撤回之后再加进来仍是第 2 次')

  /* 同一天连点两下不算认两次：1 当天再点是撤回 */
  eq(step({ add: D1, hit: D2, n: 3 }, D2), { add: D1, n: 3 }, '1 当天再点应撤回成 2，次数不变')

  /* 当天第一次加进来的，再点是撤回（误点），记录整个消失 */
  eq(step({ add: D2, n: 1 }, D2), null, '当天首次加的再点应直接撤回')

  /* 当天移出的，再点能原样撤回，次数不变 */
  var gone = step({ add: D1, hit: D2, n: 2 }, D3)
  eq(state(gone), 'out', '移出后状态应是 out')
  eq(step(gone, D3), { add: D1, hit: D2, n: 2 }, '当天移出的再点应原样撤回')

  /* 清空错字集：只改状态，不动次数；已经移出的原样不动 */
  var cleared = Z.markClear({ add: D1, hit: D2, n: 4 }, D3)
  eq(state(cleared), 'out', '清空后应是 out')
  eq(count(cleared), 4, '清空不应抹掉累计次数')
  eq(state(step(cleared, D4)), 'wrong', '清空后隔天点应重新进来')
  eq(count(step(cleared, D4)), 5, '清空后再进来应接着累计')
  var old = { n: 2, out: D1 }
  eq(Z.markClear(old, D3), old, '清空不应改动已经移出的字')
  eq(Z.markClear(null, D3), null, '清空 null 应返回 null')

  /* 老数据：v1 只存了字（add 空串），v2 早期没有 n —— 都当作进过 1 次 */
  eq(step({ add: '' }, D1), { add: '', hit: D1, n: 1 }, '没有日期、没有次数的老条目今天点应记一次认出')
  eq(count({ add: D1 }), 1, '没有 n 的老条目应当算 1 次')
  eq(count(null), 0, 'null 应是 0 次')

  /* 结算后又点：见 checkMarkMiss */

  /* 返回的是新对象，不改传进来的那个 —— mark 层靠这个做撤回 */
  var orig = { add: D1, n: 1 }
  step(orig, D2)
  Z.markClear(orig, D2)
  eq(orig, { add: D1, n: 1 }, '不应改动传入的条目')

  eq(state(null), 'out', 'null 应是 out')
  eq(state(undefined), 'out', 'undefined 应是 out')
}

/* ---------- 5c. 复习结算：没点的算又错一次（markMiss / markUnmiss） ---------- */

/*
 * 「点了才算认出」只说明了点过的字；没点的字是又不认识了，还是这次根本没复习，系统分不出来。
 * 所以由家长点「复习完了，结算」告诉它：卷面上还在错字集里、今天没动过的字，
 *   - 累计次数 +1；
 *   - 认出过一次（半红）的退回红底 —— 移出要【连续】两次复习都认出来；
 *   - 同一天结算两次不重复加；当天能撤销；结算后发现漏点了，点一下那个字就当作认出。
 */
function checkMarkMiss() {
  var D1 = '2026-09-20'
  var D2 = '2026-09-21'
  var D3 = '2026-09-22'
  var D4 = '2026-09-23'
  var step = Z.markStep
  var miss = Z.markMiss
  var unmiss = Z.markUnmiss
  var state = Z.markState
  var count = Z.markCount
  function eq(a, b, msg) {
    if (canon(a) !== canon(b)) {
      bad('markMiss ' + msg + '：期望 ' + JSON.stringify(b) + '，实际 ' + JSON.stringify(a))
    }
  }

  /* 红底的字没点 → 次数 +1，仍是红底 */
  var a = miss({ add: D1, n: 1, first: D1 }, D2)
  eq(state(a), 'wrong', '红底没点结算后仍是红底')
  eq(count(a), 2, '红底没点结算后次数 +1')
  eq(a.miss, D2, '应记下这次没认出的日子')
  eq(miss(a, D2), a, '同一天结算两次不应再加')

  /* 半红的字没点 → 退回红底：连续才算 */
  var b = miss({ add: D1, hit: D2, n: 1, first: D1 }, D3)
  eq(state(b), 'wrong', '半红没点结算后应退回红底')
  eq(count(b), 2, '半红没点结算后次数 +1')
  var b2 = step(b, D4)
  eq(state(b2), 'once', '退回红底后再认出只算第一次')
  eq(state(step(b2, '2026-09-24')), 'out', '再隔一次复习也认出才移出')

  /* 今天动过的不算没认出：今天刚收进来的、今天认出的、今天移出的 */
  var fresh = { add: D2, n: 1, first: D2 }
  eq(miss(fresh, D2), fresh, '今天刚收进来的字不应结算')
  var hitToday = { add: D1, hit: D2, n: 1, first: D1 }
  eq(miss(hitToday, D2), hitToday, '今天认出的字不应结算')
  var outToday = { add: D1, hit: D2, out: D3, n: 1, first: D1 }
  eq(miss(outToday, D3), outToday, '今天移出的字不应结算')
  eq(miss(null, D2), null, 'null 结算应原样返回')
  var longOut = { n: 3, out: D1 }
  eq(miss(longOut, D2), longOut, '早就移出的字不应结算')

  /* 撤销结算：原样回去 */
  eq(unmiss(a, D2), { add: D1, n: 1, first: D1 }, '撤销结算应回到红底、次数退回')
  eq(unmiss(b, D3), { add: D1, hit: D2, n: 1, first: D1 }, '撤销结算应回到半红')
  eq(unmiss(a, D3), a, '隔天不能撤销前一天的结算')
  var twice = miss(unmiss(miss({ add: D1, miss: D1, n: 2, first: D1 }, D2), D2), D2)
  eq(unmiss(twice, D2), { add: D1, miss: D1, n: 2, first: D1 }, '撤销应恢复上一次没认出的日子')

  /* 结算后发现漏点了：点一下 = 当作今天认出（次数退回） */
  var fixA = step(a, D2)
  eq(state(fixA), 'once', '结算后点红底的字应当作今天认出')
  eq(count(fixA), 1, '结算后点一下次数应退回')
  eq(step(fixA, D2), { add: D1, n: 1, first: D1 }, '再点一下回到结算前的样子')
  var fixB = step(b, D3)
  eq(state(fixB), 'out', '半红结算后点一下应当作第二次认出而移出')
  eq(count(fixB), 1, '移出时次数也应退回')
  eq(step(fixB, D3), { add: D1, hit: D2, n: 1, first: D1 }, '再点一下回到结算前的半红')

  /* 结算过的字隔天照常走：认出 / 下次复习再结算 */
  eq(state(step(a, D3)), 'once', '结算过的字隔天点一下应记认出')
  eq(step(a, D3).miss, D2, '最近一次没认出的日子要留着（历史统计用）')
  eq(count(miss(a, D3)), 3, '隔天再结算应接着加')

  /* 不改传入的条目 */
  var orig = { add: D1, hit: D2, n: 1, first: D1 }
  miss(orig, D3)
  unmiss(miss(orig, D3), D3)
  eq(orig, { add: D1, hit: D2, n: 1, first: D1 }, '不应改动传入的条目')

  /* 清空错字集后同一天恢复，结算记录还在、仍可撤销 */
  var cl = Z.markClear(a, D2)
  var back = step(cl, D2)
  eq(unmiss(back, D2), { add: D1, n: 1, first: D1 }, '清空又撤回后仍能撤销当天的结算')
}

/* ---------- 5d. 附页抽字的权重（reviewWeight） ---------- */

function checkWeight() {
  var w = Z.reviewWeight
  function eq(a, b, msg) {
    if (a !== b) bad('reviewWeight ' + msg + '：期望 ' + b + '，实际 ' + a)
  }
  eq(w({ add: 'x', n: 1 }), 2, '错 1 次、红底')
  eq(w({ add: 'x', hit: 'y', n: 1 }), 1, '错 1 次、半红（上次认出了）权重减半')
  eq(w({ add: 'x', n: 4 }), 8, '错 4 次、红底')
  eq(w({ add: '' }), 2, '老数据没有 n 当作 1 次')
  eq(w({ n: 3, out: 'x' }), 0, '已移出的不抽')
  eq(w(null), 0, 'null 不抽')
}

/* ---------- 5e. 历史错字统计（historyStats） ---------- */

function checkHistory() {
  var marks = {
    鸟: { add: '2026-09-20', n: 3, first: '2026-09-01', miss: '2026-10-01' },
    闪: { add: '2026-09-21', hit: '2026-09-22', n: 1, first: '2026-09-21' },
    瓜: { out: '2026-09-25', add: '2026-09-02', n: 3 },
    伞: { add: '' },
    坏: 'oops'
  }
  var h = Z.historyStats(marks)
  function eq(a, b, msg) {
    if (canon(a) !== canon(b)) {
      bad('historyStats ' + msg + '：期望 ' + JSON.stringify(b) + '，实际 ' + JSON.stringify(a))
    }
  }
  eq(h.total, 4, '历史错过的字数（坏条目不算）')
  eq(h.inSet, 3, '现在还在错字集里的')
  eq(h.once, 1, '只差一次的')
  eq(h.out, 1, '已移出（学会了）的')
  eq(h.times, 8, '累计错的次数')
  eq(h.groups.map(function (g) { return g.n }), [3, 1], '按次数从多到少分组')
  eq(h.groups[0].items.map(function (i) { return i.ch }), Z.sortByTable(['鸟', '瓜']), '同次数按字表顺序')
  eq(h.groups[0].items.filter(function (i) { return i.ch === '鸟' })[0],
    { ch: '鸟', n: 3, st: 'wrong', first: '2026-09-01', last: '2026-10-01' }, '单条明细：最近一次错取 add / miss 里晚的')
  eq(h.groups[0].items.filter(function (i) { return i.ch === '瓜' })[0],
    { ch: '瓜', n: 3, st: 'out', first: '2026-09-02', last: '2026-09-02' }, '没有 first 的老数据用 add 顶')
  eq(Z.historyStats(null).total, 0, 'null 当作空')
}

/* ---------- 6. 本周卷附页抽字（sampleWrong） ---------- */

/*
 * 附页那批字是随机抽的，所以这里【不是】挑一次看看对不对 ——
 * 随机的东西抽一次永远是对的。三件事必须成立，且要经得起反复抽：
 *   ① 边界：不越界、不重复、不把本周卷上的字再印一遍
 *   ② 顺序：不管怎么抽，印出来都按字表顺序
 *   ③ 均匀：每个字被抽中的概率应当一样，不能因为 Fisher–Yates 只洗前 max 个就偏了
 * ③ 是最容易写错又最看不出来的（洗牌少洗一位、边界差一格，结果依然「看起来很随机」），
 * 所以用一个定死的伪随机序列跑 20000 次，统计每个字的中签率。
 */
function checkSample() {
  var pool = Z.pool()
  var MAX = 20

  /* ① 边界 */
  var cases = [
    [[], [], '空错字集'],
    [null, [], '错字集是 null'],
    [pool.slice(0, 1), [], '只有 1 个字'],
    [pool.slice(0, MAX), [], '正好 20 个字'],
    [pool.slice(0, MAX + 1), [], '21 个字'],
    [pool.slice(0, 100), [], '100 个字']
  ]
  cases.forEach(function (c) {
    var out = Z.sampleWrong(c[0], c[1], MAX)
    var want = Math.min((c[0] || []).length, MAX)
    if (out.length !== want) {
      bad('sampleWrong（' + c[2] + '）应返回 ' + want + ' 个，实际 ' + out.length)
    }
    var uniq = new Set(out)
    if (uniq.size !== out.length) bad('sampleWrong（' + c[2] + '）返回了重复的字')
    out.forEach(function (ch) {
      if ((c[0] || []).indexOf(ch) < 0) bad('sampleWrong（' + c[2] + '）凭空多出一个字：' + ch)
    })
  })

  /* 本周卷上的字一个都不能出现在附页上 */
  var week = pool.slice(0, 100)
  for (var t = 0; t < 200; t++) {
    var got = Z.sampleWrong(pool.slice(0, 150), week, MAX)
    got.forEach(function (ch) {
      if (week.indexOf(ch) >= 0) bad('sampleWrong 把本周卷上的字又抽了一遍：' + ch)
    })
    if (got.length !== MAX) bad('sampleWrong 剔除本周字后应仍有 20 个，实际 ' + got.length)
  }

  /* 全被本周卷盖住时应当返回空，而不是硬凑数 */
  if (Z.sampleWrong(pool.slice(0, 50), pool.slice(0, 50), MAX).length) {
    bad('sampleWrong：错字全在本周卷上时应返回空')
  }
  /* max 非正数不能炸 */
  ;[0, -1, null, undefined].forEach(function (m) {
    var out = Z.sampleWrong(pool.slice(0, 50), [], m)
    if (!Array.isArray(out) || out.length) bad('sampleWrong(max=' + m + ') 应返回空数组')
  })

  /* ② 顺序：随机抽 200 次，每次结果都必须按字表下标升序 */
  for (var k = 0; k < 200; k++) {
    var s = Z.sampleWrong(pool.slice(0, 300), [], MAX)
    for (var i = 1; i < s.length; i++) {
      if (D.LIST.indexOf(s[i]) <= D.LIST.indexOf(s[i - 1])) {
        bad('sampleWrong 返回的顺序不是字表顺序：' + s.join(''))
        break
      }
    }
  }

  /*
   * ③ 均匀性。注入一个定死的 mulberry32（与 js/generator.js 里口算用的同一个），
   * 脚本每次跑结果一致，不会偶发红。
   * 60 个字里抽 20，跑 N 轮，理论中签率 1/3；允许 ±20% 的浮动。
   */
  var seed = 20260919
  function rnd() {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    var x = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296
  }
  var cand = pool.slice(0, 60)
  var hits = {}
  cand.forEach(function (ch) {
    hits[ch] = 0
  })
  var ROUNDS = 20000
  for (var r = 0; r < ROUNDS; r++) {
    Z.sampleWrong(cand, [], MAX, rnd).forEach(function (ch) {
      hits[ch]++
    })
  }
  var expect = (ROUNDS * MAX) / cand.length
  var lo = expect * 0.8
  var hi = expect * 1.2
  var worst = null
  cand.forEach(function (ch) {
    if (hits[ch] < lo || hits[ch] > hi) {
      if (!worst || Math.abs(hits[ch] - expect) > Math.abs(hits[worst] - expect)) worst = ch
    }
  })
  if (worst) {
    bad(
      'sampleWrong 抽得不均匀：「' + worst + '」' + ROUNDS + ' 轮中签 ' + hits[worst] +
      ' 次，期望约 ' + Math.round(expect) + ' 次'
    )
  }

  /*
   * ④ 按权重偏向：60 个字里 10 个权重 8（错 4 次、红底），50 个权重 1。
   * 抽 20 个，重的每轮中签率应远高于轻的（理论上重的几乎每次都在）。
   */
  var heavy = {}
  cand.slice(0, 10).forEach(function (ch) {
    heavy[ch] = true
  })
  var hHits = 0
  var lHits = 0
  var R2 = 5000
  for (var k = 0; k < R2; k++) {
    Z.sampleWrong(cand, [], MAX, rnd, function (ch) {
      return heavy[ch] ? 8 : 1
    }).forEach(function (ch) {
      if (heavy[ch]) hHits++
      else lHits++
    })
  }
  var hRate = hHits / (R2 * 10)
  var lRate = lHits / (R2 * 50)
  if (!(hRate > 0.85 && hRate > lRate * 3)) {
    bad('sampleWrong 按权重抽不够偏：重的中签率 ' + hRate.toFixed(2) + '，轻的 ' + lRate.toFixed(2))
  }
  /* 权重为 0 的不能被抽到（已移出的字） */
  var zero = Z.sampleWrong(cand, [], MAX, rnd, function (ch) {
    return heavy[ch] ? 1 : 0
  })
  if (zero.length !== 10 || zero.some(function (ch) { return !heavy[ch] })) {
    bad('sampleWrong 抽到了权重为 0 的字：' + zero.join(''))
  }
}

/* ---------- 7. 设置钳位 ---------- */

function checkSettings() {
  var cases = [
    [{ week: 0 }, 'week', 1],
    [{ week: -1 }, 'week', 1],
    [{ week: '' }, 'week', 1],
    [{ week: 'abc' }, 'week', 1],
    [{ week: 999 }, 'week', 16],
    [{ week: 16.4 }, 'week', 16],
    [{ perWeek: 0 }, 'perWeek', 10],
    [{ perWeek: 9999 }, 'perWeek', 200],
    [{ perWeek: '' }, 'perWeek', 100],
    [{ font: 'comic' }, 'font', 'kai'],
    /* 模式白名单。「整表核对」（?mode=proof，更早是 ?proof=true）已下架，
       老链接一律回到本周复习，不能停在一个不存在的页签上 */
    [{}, 'mode', 'week'],
    [{ mode: 'wrong' }, 'mode', 'wrong'],
    [{ mode: 'history' }, 'mode', 'history'],
    [{ mode: 'proof' }, 'mode', 'week'],
    [{ mode: 'xx' }, 'mode', 'week'],
    [{ mode: '' }, 'mode', 'week'],
    [{ proof: 'true' }, 'mode', 'week'],
    [{ proof: 'false' }, 'mode', 'week'],
    [{ copies: 9 }, 'copies', 2],
    [{ copies: 0 }, 'copies', 1],
    [{ perPage: -5 }, 'perPage', 0]
  ]
  cases.forEach(function (c) {
    var got = T.sanitize(c[0])[c[1]]
    if (got !== c[2]) {
      bad('sanitize(' + JSON.stringify(c[0]) + ').' + c[1] + ' 应为 ' + c[2] + '，实际 ' + got)
    }
  })

  /* 每周字数变大后，原来合法的周次会越界 —— 必须在 sanitize 里就钳掉，
     否则面板上会停在一个印不出字的周次上。 */
  var s = T.sanitize({ week: 16, perWeek: 200 })
  if (s.week !== 8) bad('每周字数改成 200 后第 16 周应钳到第 8 周，实际 ' + s.week)

  /* 标题超长要截断，否则页眉会被撑到换行、把页脚挤下去 */
  if (T.sanitize({ title: 'x'.repeat(99) }).title.length !== 30) {
    bad('标题应截断到 30 字')
  }
}

/* ---------- 跑 ---------- */

function main() {
  var t0 = Date.now()
  var steps = [
    ['字表结构与转录质量（' + SCREENS + ' 屏 × ' + COLS + ' × ' + ROWS + ' = ' + RAW_TOTAL + ' 字）', checkTable],
    ['周次切分（每周 10~200 字全扫）', checkSlices],
    ['排版放得下（10~200 字全扫）', checkLayout],
    ['面板所有设置组合都排得出版面', checkAllCombos],
    ['换每周字数时进度不倒退', checkRemap],
    ['错字集排序与错字卷排版（1~400 字全扫）', checkWrongSet],
    ['错字进出规则与累计次数', checkMarkStep],
    ['复习结算：没点的算又错一次、连续两次才移出', checkMarkMiss],
    ['附页抽字权重', checkWeight],
    ['历史错字统计', checkHistory],
    ['附页抽字：边界 / 顺序 / 均匀性 / 按权重偏向（2 万轮）', checkSample],
    ['设置钳位', checkSettings]
  ]
  steps.forEach(function (st) {
    var before = problems.length
    st[1]()
    console.log((problems.length > before ? '✗' : '✓') + ' ' + st[0])
  })

  console.log('')
  if (problems.length) {
    console.log('✗ 发现 ' + problems.length + ' 处问题（最多列前 20 条）：')
    problems.slice(0, 20).forEach(function (m) {
      console.log('   · ' + m)
    })
    process.exit(1)
  }
  console.log('✓ 全部通过，耗时 ' + (Date.now() - t0) + 'ms')
  console.log('')
  console.log('注意：本脚本抓不住「把未认成末」这类【字对字】的转录错误 ——')
  console.log('两个都是合法汉字、都不重复。改字表时要拿洪恩的字表截图逐屏人工对一遍。')
}

main()
