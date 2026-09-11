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
var SD = globalThis.SumSum.shudu

/* 盘型参数在这里【重新写一遍】，不从 shudu-core 取——那边写错了这里才能发现 */
var SHAPES = {
  s3: { n: 3, bh: 0, bw: 0 },
  s4: { n: 4, bh: 2, bw: 2 },
  s6: { n: 6, bh: 2, bw: 3 }
}

var TARGET = {
  s3: { easy: 5, normal: 4, hard: 3 },
  s4: { easy: 9, normal: 7, hard: 5 },
  s6: { easy: 20, normal: 16, hard: 12 }
}

var ROUNDS = 200

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

  /* 三宫格无宫：这个布局同列有重复，必须判非法 */
  var sp3 = SHAPES.s3
  var lat = [1, 2, 3, 2, 3, 1, 3, 1, 2]
  if (!isValidFull(sp3, lat)) fails.push('isValidFull 把一个合法的三宫格拉丁方判成了非法')
  var lat2 = [1, 2, 3, 1, 3, 2, 3, 1, 2]
  if (isValidFull(sp3, lat2)) fails.push('isValidFull 没抓出三宫格的同列重复')

  /* 六宫格的宫是 2 行 × 3 列：格 0 和格 2 同宫，格 0 和格 3 不同宫 */
  var sp6 = SHAPES.s6
  if (boxOf(sp6, 0) !== boxOf(sp6, 2)) fails.push('boxOf 认为六宫格的 (0,0) 与 (0,2) 不同宫')
  if (boxOf(sp6, 0) === boxOf(sp6, 3)) fails.push('boxOf 认为六宫格的 (0,0) 与 (0,3) 同宫')
  if (boxOf(sp6, 0) !== boxOf(sp6, 6)) fails.push('boxOf 认为六宫格的 (0,0) 与 (1,0) 不同宫')
  if (boxOf(sp6, 0) === boxOf(sp6, 12)) fails.push('boxOf 认为六宫格的 (0,0) 与 (2,0) 同宫')

  return fails
}

/* ---------- 主校验 ---------- */

function checkCombo(shapeKey, level, report) {
  var sp = SHAPES[shapeKey]
  var target = TARGET[shapeKey][level]

  for (var r = 1; r <= ROUNDS; r++) {
    var seed = r * 7919 + shapeKey.charCodeAt(1) * 131 + level.length
    var res = SD.generate({ shape: shapeKey, level: level, count: 1, seed: seed, noDuplicates: false })
    var q = res.puzzles[0]
    var where = shapeKey + '/' + level + ' seed=' + seed

    if (!q) { report(where + '：generate 没产出题目'); continue }

    /* ① 完整解本身合法 */
    if (!isValidFull(sp, q.solution)) report(where + '：solution 本身不合法')

    /* ② 题面是完整解的子集（挖洞不能改动留下的数字） */
    var subsetOk = true
    for (var i = 0; i < q.puzzle.length; i++) {
      if (q.puzzle[i] !== 0 && q.puzzle[i] !== q.solution[i]) subsetOk = false
    }
    if (!subsetOk) report(where + '：题面里的提示数字与 solution 对不上')

    /* ③ 提示数 —— 允许比目标多 1（六宫格挑战档约 1/300 挖不到底，多一个只会更简单） */
    var clues = q.puzzle.filter(function (x) { return x !== 0 }).length
    if (clues !== q.clues) report(where + '：clues 字段(' + q.clues + ') 与题面实际(' + clues + ') 不符')
    if (clues < target || clues > target + 1) {
      report(where + '：提示数 ' + clues + ' 不在 [' + target + ', ' + (target + 1) + '] 内')
    }

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
  var combos = [['s3', 'hard'], ['s4', 'normal'], ['s6', 'hard']]
  combos.forEach(function (c) {
    var s = { shape: c[0], level: c[1], count: 6, seed: 20260911, noDuplicates: true }
    var a = JSON.stringify(SD.generate(s).puzzles)
    var b = JSON.stringify(SD.generate(s).puzzles)
    if (a !== b) report(c[0] + '/' + c[1] + '：同一种子两次生成结果不同（不可复现）')

    /* 换个种子应当换一批题，否则说明种子根本没起作用 */
    var other = JSON.stringify(SD.generate({
      shape: c[0], level: c[1], count: 6, seed: 20260912, noDuplicates: true
    }).puzzles)
    if (a === other) report(c[0] + '/' + c[1] + '：换种子后题目没变（种子没生效）')
  })
}

function checkNoDuplicates(report) {
  var s = { shape: 's3', level: 'normal', count: 12, seed: 424242, noDuplicates: true }
  var res = SD.generate(s)
  var seen = {}
  res.puzzles.forEach(function (q) {
    if (seen[q.key]) report('s3/normal：开了「题目不重复」仍出现重复题面')
    seen[q.key] = 1
  })
  if (res.puzzles.length !== 12) {
    report('s3/normal：要 12 题只出了 ' + res.puzzles.length + ' 题（shortfall=' + res.shortfall + '）')
  }
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

  var shapes = ['s3', 's4', 's6']
  var levels = ['easy', 'normal', 'hard']
  var total = 0
  var t0 = Date.now()

  shapes.forEach(function (sk) {
    levels.forEach(function (lv) {
      var before = problems.length
      checkCombo(sk, lv, report)
      total += ROUNDS
      var bad = problems.length - before
      console.log(
        (bad ? '✗' : '✓') + ' ' + sk + '/' + lv +
        '  目标 ' + TARGET[sk][lv] + ' 提示  ' + ROUNDS + ' 局' +
        (bad ? '  —— ' + bad + ' 处问题' : '')
      )
    })
  })

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
