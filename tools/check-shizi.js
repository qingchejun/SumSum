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
 * 脚本一定抓不住，只能靠页面上的「整表核对」模式拿原图逐屏对。
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

  /* 整表核对页：强制 15 列，必须正好 12 行、和原图同构 */
  var proof = R.layout(COLS * ROWS, COLS)
  if (!proof || proof.cols !== COLS || proof.rows !== ROWS) {
    bad('核对页应为 ' + COLS + ' 列 × ' + ROWS + ' 行')
  }

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

/* ---------- 5. 设置钳位 ---------- */

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
  console.log('两个都是合法汉字、都不重复。那一层只能在 shizi.html 里勾「整表核对」，')
  console.log('拿洪恩的字表截图逐屏对一遍。')
}

main()
