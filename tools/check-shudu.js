/**
 * 数独生成器校验脚本。用法：node tools/check-shudu.js
 *
 * 项目没有测试框架也没有 package.json，所以这是一个能用 node 直接跑的独立脚本。
 * js/shudu-core.js 是无 DOM 依赖的 IIFE，尾部挂在 globalThis 上，require 进来即可。
 *
 * 【重要】本文件里的求解器 / 合法性检查是【独立于 shudu-core.js 另写一遍的】，
 * 故意不复用那边的 board / candidates / logicSolve。两套独立实现互为对照，
 * 才抓得住「生成器和校验器犯同一个错」这种查不出来的情况。
 *
 * 这个项目的历史教训是：自己写的校验脚本出错的次数比生成器还多（正则截片段、
 * 子串匹配、数组索引错位、漏掉规则）。所以报错时先怀疑校验器本身，
 * 手算一两个样例确认后再动生成器。脚本末尾有一组「自检」就是为此准备的。
 */
'use strict'

require('../js/shudu-core.js')
require('../js/shudu-settings.js') // 只为验 sanitize 的钳位；它的 load/save 碰 DOM，这里不调
require('../js/shudu-render.js') // 只为验排版算的 mm 放不放得下；render() 碰 DOM，这里不调
var SD = globalThis.SumSum.shudu

/* 盘型参数在这里【重新写一遍】，不从 shudu-core 取——那边写错了这里才能发现 */
var SHAPES = {
  s4: { n: 4, bh: 2, bw: 2 },
  s6: { n: 6, bh: 2, bw: 3 },
  s9: { n: 9, bh: 3, bw: 3 }
}

/*
 * 难度是「给几个提示」的连续区间，所以要把【整个区间每一档】都扫一遍，
 * 不能只挑三个点验 —— 用户能拖到任意一档，任意一档都得守住红线。
 * 区间下限同样在这里重写一遍，与 shudu-core 的 CLUE_RANGE 对照。
 */
var RANGE = {
  s4: { min: 5, max: 12 },
  s6: { min: 11, max: 26 },
  s9: { min: 27, max: 50 }
}

/* 每档跑多少局。九宫格单局贵得多（81 格，独立回溯计数器约 2ms 一局），
   档位又有 23 个，所以比小盘少一些；实测整脚本仍在 2 秒内跑完。 */
var ROUNDS = { s4: 60, s6: 60, s9: 50 }

/* ---------- 独立实现的基础工具 ---------- */

/* 格 i 的行号 / 列号 / 宫号（宫号在无宫盘型下恒为 -1） */
function rowOf(sp, i) { return Math.floor(i / sp.n) }
function colOf(sp, i) { return i % sp.n }
function boxOf(sp, i) {
  if (!sp.bh) return -1
  var perRow = sp.n / sp.bw
  return Math.floor(rowOf(sp, i) / sp.bh) * perRow + Math.floor(colOf(sp, i) / sp.bw)
}

/* 在 g 上把 v 放进格 i 是否合法（直接按定义逐格比对，不用预计算表） */
function canPlace(sp, g, i, v) {
  for (var j = 0; j < g.length; j++) {
    if (j === i || g[j] !== v) continue
    if (rowOf(sp, j) === rowOf(sp, i)) return false
    if (colOf(sp, j) === colOf(sp, i)) return false
    if (sp.bh && boxOf(sp, j) === boxOf(sp, i)) return false
  }
  return true
}

/* 完整棋盘是否合法：每行、每列、每宫都恰好含 1~n 各一次 */
function isValidFull(sp, g) {
  var groups = {}
  for (var i = 0; i < g.length; i++) {
    if (!g[i] || g[i] < 1 || g[i] > sp.n) return false
    var keys = ['r' + rowOf(sp, i), 'c' + colOf(sp, i)]
    if (sp.bh) keys.push('b' + boxOf(sp, i))
    for (var k = 0; k < keys.length; k++) {
      var slot = keys[k] + '#' + g[i]
      if (groups[slot]) return false
      groups[slot] = 1
    }
  }
  return true
}

/* 朴素回溯数解的个数，数到 cap 就停（唯一性交叉验证用，与 logicSolve 无关） */
function countSolutions(sp, puzzle, cap) {
  var g = puzzle.slice()
  var found = 0

  function step() {
    var at = -1
    for (var i = 0; i < g.length; i++) {
      if (!g[i]) { at = i; break }
    }
    if (at < 0) { found++; return }
    for (var v = 1; v <= sp.n && found < cap; v++) {
      if (canPlace(sp, g, at, v)) {
        g[at] = v
        step()
        g[at] = 0
      }
    }
  }

  step()
  return found
}

/* 独立实现的「只用唯一候选数」求解器（和 shudu-core 的 logicSolve 对照） */
function nakedOnly(sp, puzzle) {
  var g = puzzle.slice()
  var moved = true
  while (moved) {
    moved = false
    for (var i = 0; i < g.length; i++) {
      if (g[i]) continue
      var only = 0
      var n = 0
      for (var v = 1; v <= sp.n; v++) {
        if (canPlace(sp, g, i, v)) { n++; only = v }
      }
      if (n === 0) return null
      if (n === 1) { g[i] = only; moved = true }
    }
  }
  for (var k = 0; k < g.length; k++) {
    if (!g[k]) return null
  }
  return g
}

function same(a, b) {
  if (a.length !== b.length) return false
  for (var i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false
  }
  return true
}

/* ---------- 校验器自检：先确认校验器本身是对的 ---------- */

function selfTest() {
  var fails = []
  var sp4 = SHAPES.s4

  /* 一个手工写死的四宫格完整解，行列宫都对 */
  var good = [
    1, 2, 3, 4,
    3, 4, 1, 2,
    2, 1, 4, 3,
    4, 3, 2, 1
  ]
  if (!isValidFull(sp4, good)) fails.push('isValidFull 把一个合法的四宫格判成了非法')

  /* 把两个格对调，制造同列重复，必须判非法 */
  var bad = good.slice()
  bad[0] = 3
  bad[8] = 1
  if (isValidFull(sp4, bad)) fails.push('isValidFull 没抓出同行/同列重复')

  /* 全空的四宫格必然多解（288 个），countSolutions 至少要数到 2 */
  var empty = new Array(16)
  for (var z = 0; z < 16; z++) empty[z] = 0
  if (countSolutions(sp4, empty, 2) !== 2) fails.push('countSolutions 在全空盘上没数到 2 个解')

  /* 完整解本身只有 1 个解 */
  if (countSolutions(sp4, good, 2) !== 1) fails.push('countSolutions 在完整解上没返回 1')

  /* 挖掉一格，唯一候选数一步就能补回来 */
  var one = good.slice()
  one[5] = 0
  var back = nakedOnly(sp4, one)
  if (!back || !same(back, good)) fails.push('nakedOnly 补不回被挖掉的单格')

  /* 六宫格的宫是 2 行 × 3 列：格 0 和格 2 同宫，格 0 和格 3 不同宫 */
  var sp6 = SHAPES.s6
  if (boxOf(sp6, 0) !== boxOf(sp6, 2)) fails.push('boxOf 认为六宫格的 (0,0) 与 (0,2) 不同宫')
  if (boxOf(sp6, 0) === boxOf(sp6, 3)) fails.push('boxOf 认为六宫格的 (0,0) 与 (0,3) 同宫')
  if (boxOf(sp6, 0) !== boxOf(sp6, 6)) fails.push('boxOf 认为六宫格的 (0,0) 与 (1,0) 不同宫')
  if (boxOf(sp6, 0) === boxOf(sp6, 12)) fails.push('boxOf 认为六宫格的 (0,0) 与 (2,0) 同宫')

  /* 九宫格的宫是 3×3：格 0 与 (2,2)=20 同宫，与 (0,3)=3 和 (3,0)=27 不同宫；
     另验一个非左上角的宫，免得 boxOf 的整除只在第 0 宫碰巧算对 */
  var sp9 = SHAPES.s9
  if (boxOf(sp9, 0) !== boxOf(sp9, 20)) fails.push('boxOf 认为九宫格的 (0,0) 与 (2,2) 不同宫')
  if (boxOf(sp9, 0) === boxOf(sp9, 3)) fails.push('boxOf 认为九宫格的 (0,0) 与 (0,3) 同宫')
  if (boxOf(sp9, 0) === boxOf(sp9, 27)) fails.push('boxOf 认为九宫格的 (0,0) 与 (3,0) 同宫')
  if (boxOf(sp9, 40) !== boxOf(sp9, 30)) fails.push('boxOf 认为九宫格的 (4,4) 与 (3,3) 不同宫')
  if (boxOf(sp9, 40) === boxOf(sp9, 29)) fails.push('boxOf 认为九宫格的 (4,4) 与 (3,2) 同宫')
  if (boxOf(sp9, 80) !== 8) fails.push('boxOf 认为九宫格右下角不在第 8 宫')

  return fails
}

/* ---------- 主校验 ---------- */

function checkCombo(shapeKey, target, report) {
  var sp = SHAPES[shapeKey]

  for (var r = 1; r <= ROUNDS[shapeKey]; r++) {
    var seed = r * 7919 + shapeKey.charCodeAt(1) * 131 + target
    var res = SD.generate({ shape: shapeKey, clues: target, count: 1, seed: seed, noDuplicates: false })
    var q = res.puzzles[0]
    var where = shapeKey + '/' + target + '提示 seed=' + seed

    if (!q) { report(where + '：generate 没产出题目'); continue }

    /* ① 完整解本身合法 */
    if (!isValidFull(sp, q.solution)) report(where + '：solution 本身不合法')

    /* ② 题面是完整解的子集（挖洞不能改动留下的数字） */
    var subsetOk = true
    for (var i = 0; i < q.puzzle.length; i++) {
      if (q.puzzle[i] !== 0 && q.puzzle[i] !== q.solution[i]) subsetOk = false
    }
    if (!subsetOk) report(where + '：题面里的提示数字与 solution 对不上')

    /*
     * ③ 提示数必须【精确等于】滑块上的数字。
     * 这一条是严格相等而不是给区间：区间下限本来就是按「实测 100% 挖得到」挑的，
     * 就是为了让面板写几个、卷子上就是几个。哪一档开始挖不到，这里就会立刻报出来。
     */
    var clues = q.puzzle.filter(function (x) { return x !== 0 }).length
    if (clues !== q.clues) report(where + '：clues 字段(' + q.clues + ') 与题面实际(' + clues + ') 不符')
    if (clues !== target) report(where + '：要 ' + target + ' 个提示，实际挖出 ' + clues + ' 个')

    /* ④ 红线 —— 只用唯一候选数必须能解完，且结果等于 solution */
    var logic = nakedOnly(sp, q.puzzle)
    if (!logic) {
      report(where + '：【红线】只用唯一候选数推不到底')
    } else if (!same(logic, q.solution)) {
      report(where + '：【红线】逻辑推出的解与 solution 不一致')
    }

    /* ⑤ 唯一解 —— 用独立的回溯计数器交叉验证 */
    var n = countSolutions(sp, q.puzzle, 2)
    if (n !== 1) report(where + '：解的个数是 ' + (n >= 2 ? '≥2' : n) + '，不唯一')
  }
}

function checkReproducible(report) {
  var combos = [['s4', 5], ['s4', 12], ['s6', 11], ['s6', 26], ['s9', 27], ['s9', 50]]
  combos.forEach(function (c) {
    var label = c[0] + '/' + c[1] + '提示'
    var s = { shape: c[0], clues: c[1], count: 6, seed: 20260911, noDuplicates: true }
    var a = JSON.stringify(SD.generate(s).puzzles)
    var b = JSON.stringify(SD.generate(s).puzzles)
    if (a !== b) report(label + '：同一种子两次生成结果不同（不可复现）')

    /* 换个种子应当换一批题，否则说明种子根本没起作用 */
    var other = JSON.stringify(SD.generate({
      shape: c[0], clues: c[1], count: 6, seed: 20260912, noDuplicates: true
    }).puzzles)
    if (a === other) report(label + '：换种子后题目没变（种子没生效）')
  })
}

function checkNoDuplicates(report) {
  var s = { shape: 's4', clues: 12, count: 20, seed: 424242, noDuplicates: true }
  var res = SD.generate(s)
  var seen = {}
  res.puzzles.forEach(function (q) {
    if (seen[q.key]) report('s4/12提示：开了「题目不重复」仍出现重复题面')
    seen[q.key] = 1
  })
  if (res.puzzles.length !== 20) {
    report('s4/12提示：要 20 题只出了 ' + res.puzzles.length + ' 题（shortfall=' + res.shortfall + '）')
  }
}

/*
 * 设置层：钳位与老链接翻译。放在这里一起验，是因为「滑块写几个就出几个」
 * 这条承诺一半靠生成器、一半靠 sanitize 的钳位，只验生成器不够。
 */
function checkSettings(report) {
  var ST = globalThis.SumSum.shuduSettings
  if (!ST) { report('shudu-settings.js 没加载上'); return }

  Object.keys(RANGE).forEach(function (sk) {
    var r = RANGE[sk]
    /* 越界值必须被钳进区间，而不是原样透传给生成器 */
    if (ST.sanitize({ shape: sk, clues: r.min - 3 }).clues !== r.min) report(sk + '：低于下限没被钳到 ' + r.min)
    if (ST.sanitize({ shape: sk, clues: r.max + 9 }).clues !== r.max) report(sk + '：高于上限没被钳到 ' + r.max)
    if (ST.sanitize({ shape: sk, clues: 'abc' }).clues == null) report(sk + '：非数字输入没有回退到默认值')
    /* 没给 clues 时要用【该盘型自己的】默认值，不能套用四宫格的 7 再钳到六宫格下限 */
    var d = ST.sanitize({ shape: sk }).clues
    if (d < r.min || d > r.max) report(sk + '：缺省 clues 落到了区间外（' + d + '）')
  })
  if (ST.sanitize({ shape: 's6' }).clues === RANGE.s6.min) {
    report('s6：只给 shape 时拿到的是区间下限（最难），说明没按盘型取默认值')
  }

  /* 老链接 ?level=hard 要能翻译成对应的提示数 */
  if (ST.sanitize({ shape: 's4', level: 'hard' }).clues !== 5) report('老链接 level=hard 没翻译成 5 个提示')
  if (ST.sanitize({ shape: 's4', level: 'easy' }).clues !== 9) report('老链接 level=easy 没翻译成 9 个提示')
  /* 同时给了 clues 时以 clues 为准 */
  if (ST.sanitize({ shape: 's4', level: 'hard', clues: 11 }).clues !== 11) report('clues 与 level 同时出现时没有以 clues 为准')
  /* 三宫格已下架，必须回退到四宫格而不是留下一个不存在的盘型 */
  if (ST.sanitize({ shape: 's3' }).shape !== 's4') report('已下架的 s3 没有回退到 s4')
}

/*
 * 排版：一页放 1~4 道题时，算出来的盘到底放不放得下。
 *
 * 这是纯算术，但必须验 —— 本项目在口算和奥数上都栽过「内联 mm 超出内容区、
 * 悄悄多挤一张空白页」，而这种事在屏幕预览上完全看不出来，只有打印才现形。
 * 所以这里【不复用 shudu-render 的 MM 常量】，而是照 A4 的实际尺寸
 * （210×297、页边距 15mm → 内容区 180 宽；扣掉页眉页脚剩 225 高）重算一遍，
 * 两套数字互为对证：改动 MM 里的余量若真的把版面撑破了，这里会立刻报出来。
 */
function checkLayout(report) {
  var R = globalThis.SumSum.shuduRender
  if (!R) { report('shudu-render.js 没加载上'); return }
  var W = 180 // A4 纵向内容区宽
  var H = 225 // 扣掉页眉页脚后的可用高
  var GAP = 8

  Object.keys(SHAPES).forEach(function (sk) {
    var n = SHAPES[sk].n
    for (var per = 1; per <= 4; per++) {
      var lay = R.layout(sk, per)
      var rows = Math.ceil(per / lay.cols)
      /* 盘的外框是 border + content-box，实际占地比 grid 尺寸大一圈 */
      var frame = 2 * Math.min(1.2, Math.max(0.6, lay.cell * 0.045))
      var outer = lay.cell * n + frame
      var w = lay.cols * outer + (lay.cols - 1) * GAP
      /* 一页一题时盘上方是「题号 + 规则」一行（14px + 6mm ≈ 11mm）；
         多题时是页顶规则 9mm + 每个盘的题号 7mm */
      var h = per > 1
        ? 9 + rows * (7 + outer) + (rows - 1) * GAP
        : 11 + outer

      if (lay.cell <= 0) report(sk + ' 每页 ' + per + ' 题：算出来的格子是 ' + lay.cell + 'mm')
      if (lay.cols < 1 || lay.cols > per) report(sk + ' 每页 ' + per + ' 题：列数 ' + lay.cols + ' 不合理')
      if (rows * lay.cols < per) report(sk + ' 每页 ' + per + ' 题：' + lay.cols + '列×' + rows + '行 放不下 ' + per + ' 个盘')
      if (w > W) report(sk + ' 每页 ' + per + ' 题：宽 ' + w.toFixed(1) + 'mm 超出 ' + W + 'mm')
      if (h > H) report(sk + ' 每页 ' + per + ' 题：高 ' + h.toFixed(1) + 'mm 超出 ' + H + 'mm')
    }

    /* 「自动」挡的承诺：格子不小于 15mm，而且确实是能达到这个底线的最多题数 */
    var auto = R.autoPerPage(sk)
    if (R.layout(sk, auto).cell < 15) {
      report(sk + ' 自动挡选了每页 ' + auto + ' 题，但格子只有 ' + R.layout(sk, auto).cell.toFixed(1) + 'mm')
    }
    if (auto < 4 && R.layout(sk, auto + 1).cell >= 15) {
      report(sk + ' 自动挡选了每页 ' + auto + ' 题，但 ' + (auto + 1) + ' 题的格子同样够大，白白多印了纸')
    }
  })

  /* 题目比一页的容量少时要按实际题数排，不能留着一页四题的小盘 */
  if (R.perPageOf({ shape: 's4', perPage: 0 }, 1) !== 1) report('只出 1 道题时没有按 1 道排')
  if (R.perPageOf({ shape: 's4', perPage: 0 }, 3) !== 3) report('出 3 道题时没有按 3 道排')
  if (R.perPageOf({ shape: 's4', perPage: 0 }, 9) !== 4) report('四宫格出 9 道题时每页没有排满 4 道')
  if (R.perPageOf({ shape: 's9', perPage: 0 }, 9) !== 1) report('九宫格自动挡不该一页排多道')
  /* 手动挡说了算，哪怕格子会被压得很小 */
  if (R.perPageOf({ shape: 's9', perPage: 4 }, 9) !== 4) report('手动指定每页 4 题没有生效')
  /* 设置层也得放行 0（自动）并钳住越界值 */
  var ST = globalThis.SumSum.shuduSettings
  if (ST.sanitize({ perPage: 9 }).perPage !== 4) report('perPage 超出上限没被钳到 4')
  if (ST.sanitize({ perPage: -1 }).perPage !== 0) report('perPage 负数没被钳到 0（自动）')
}

function main() {
  var problems = []
  function report(msg) { problems.push(msg) }

  var selfFails = selfTest()
  if (selfFails.length) {
    console.log('✗ 校验器自检没通过——问题在校验脚本本身，先别动生成器：')
    selfFails.forEach(function (m) { console.log('   · ' + m) })
    process.exit(1)
  }
  console.log('✓ 校验器自检通过')

  var total = 0
  var t0 = Date.now()

  /* 难度是连续区间，所以整个区间每一档都要扫，不能只挑几个点 */
  Object.keys(RANGE).forEach(function (sk) {
    var r = RANGE[sk]
    var before = problems.length
    var st = Date.now()
    var bads = []
    for (var t = r.min; t <= r.max; t++) {
      var b0 = problems.length
      checkCombo(sk, t, report)
      total += ROUNDS[sk]
      if (problems.length > b0) bads.push(t)
    }
    var bad = problems.length - before
    console.log(
      (bad ? '✗' : '✓') + ' ' + sk + '  提示数 ' + r.min + '~' + r.max +
      ' 每档 ' + ROUNDS[sk] + ' 局，共 ' + ((r.max - r.min + 1) * ROUNDS[sk]) + ' 局' +
      '  (' + (Date.now() - st) + 'ms)' +
      (bad ? '  —— 出问题的档位：' + bads.join(',') : '')
    )
  })

  var layBefore = problems.length
  checkLayout(report)
  console.log((problems.length > layBefore ? '✗' : '✓') + ' 每页多题的排版放得下')

  var setBefore = problems.length
  checkSettings(report)
  console.log((problems.length > setBefore ? '✗' : '✓') + ' 设置钳位与老链接翻译')

  var reproBefore = problems.length
  checkReproducible(report)
  console.log((problems.length > reproBefore ? '✗' : '✓') + ' 种子可复现')

  var dupBefore = problems.length
  checkNoDuplicates(report)
  console.log((problems.length > dupBefore ? '✗' : '✓') + ' 题目不重复')

  console.log('')
  if (problems.length) {
    console.log('✗ ' + total + ' 局里发现 ' + problems.length + ' 处问题（最多列前 20 条）：')
    problems.slice(0, 20).forEach(function (m) { console.log('   · ' + m) })
    process.exit(1)
  }
  console.log('✓ 全部通过：' + total + ' 局，耗时 ' + (Date.now() - t0) + 'ms')
}

main()
