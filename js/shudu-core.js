/**
 * 数独题目生成（无 DOM 依赖，可在 node 中直接测试）。
 *
 * 三种盘型共用一套数据结构：棋盘是长度 n² 的一维数组，0 表示空格。
 *  - 四宫格 4×4：2×2 的宫
 *  - 六宫格 6×6：2 行 × 3 列的宫
 *  - 九宫格 9×9：3×3 的宫，也就是最主流的那种数独
 * makeShape 仍保留 bh === 0 表示「没有宫」（纯拉丁方）的分支：代价是几行，
 * 而有了它，将来若要再加盘型就不必改结构。
 *
 * 质量红线：每一局都必须能【只用「唯一候选数」一招】推到底——任何时刻棋盘上
 * 都至少存在一个空格，它的行/列/宫里已出现了除一个数以外的所有数。一年级的孩子
 * 一旦推不下去就会开始蒙，所以宁可题目简单，也绝不能出现「必须试探」的局面。
 * 挖洞时用 logicSolve 逐格验收，唯一解是白送的（每一步都是被逼出来的，
 * 不存在第二条路），不需要另外做唯一性检查。
 *
 * 题目对象：{ shape, puzzle, solution, clues, key }
 *  - shape：盘型 key，'s4' / 's6' / 's9'
 *  - puzzle：题面，一维数组，0 = 待填
 *  - solution：完整解，同长度
 *  - clues：题面里非 0 的个数（= 提示数）
 *  - key：puzzle.join(',')，供「题目不重复」去重
 */
(function (root) {
  'use strict'

  /*
   * 可复现的随机源（mulberry32）。同一个种子必定生成同一批题，
   * 这样「重新打印刚才那张卷子」「把链接发给别人」才拿得到一模一样的题目。
   *
   * 与 js/generator.js 里的同名函数是同一个算法，这里是有意抄一份而不是共享：
   * 那边是模块私有函数，要共享就得让本页连整个口算生成器一起加载，或者给已经
   * 正常工作的 index.html 插入新的加载顺序依赖——为 8 行代码不值得。两边各自
   * 持有独立的 rnd 实例，种子语义本来就是各模块独立的，漂移了也不会出问题。
   */
  function makeRandom(seed) {
    var t = seed >>> 0
    return function () {
      t = (t + 0x6d2b79f5) >>> 0
      var r = Math.imul(t ^ (t >>> 15), t | 1)
      r ^= r + Math.imul(r ^ (r >>> 7), r | 61)
      return ((r ^ (r >>> 14)) >>> 0) / 4294967296
    }
  }

  /* ---------- 盘型 ---------- */

  /* 盘型定义。bh / bw = 宫的高 / 宽；bh 为 0 表示没有宫（纯拉丁方） */
  var SHAPES = [
    { key: 's4', n: 4, bh: 2, bw: 2, name: '四宫格', label: '四宫格 4×4', note: '行、列、2×2 宫' },
    { key: 's6', n: 6, bh: 2, bw: 3, name: '六宫格', label: '六宫格 6×6', note: '行、列、2×3 宫' },
    { key: 's9', n: 9, bh: 3, bw: 3, name: '九宫格', label: '九宫格 9×9', note: '行、列、3×3 宫' }
  ]

  /*
   * 难度就是「给几个提示」，由用户直接拖滑块选，不再套「简单/普通/挑战」三档——
   * 三档是我们替家长猜的，而每个孩子卡在哪一档只有家长知道，直接给数字更灵活。
   *
   * min 不是理论下限，而是**用出厂代码实测 1200 局 100% 命中**的那个值
   *（digTo 会重挖，见 MAX_DIG_TRIES；下面的数字都是重挖之后的）：
   *   四宫格 3 个提示 0%、4 个 99.8%、5 个才 100%  → 下限 5
   *   六宫格 9 个 47%、10 个 99.0%、11 个才 100%   → 下限 11
   *   九宫格 25 个 91%、26 个 99.8%、27 个才 100%  → 下限 27
   * 取 100% 的那个值当下限，是为了保证「面板上写几个，卷子上就是几个」——
   * 否则家长拖到 26 却时不时拿到 27，会以为程序坏了。
   * 99.8% 这种看着挺高，但一张 20 题的卷子就有 4% 的概率露馅，不能要。
   * max 取到「盘上还剩三四成空格」为止，再多提示就没什么可推的了。
   *
   * 九宫格值得单说一句：它的下限 28 个提示【正好落在真实数独的常规区间里】
   * （市面上「简单」档一般 30 上下、「中等」25~28），也就是说本模块那条
   * 「只用唯一候选数就能推完、绝不用猜」的红线，在九宫格上并没有把题目
   * 变成注水的送分题。原因是九宫格每个格子有 20 个邻居，只要这 20 格里
   * 凑出 8 个不同数字它就被逼死了 —— 盘越大，唯一候选数反而越好找。
   */
  var CLUE_RANGE = {
    s4: { min: 5, max: 12, def: 7 },
    s6: { min: 11, max: 26, def: 16 },
    s9: { min: 27, max: 50, def: 35 }
  }

  function shapeOf(key) {
    for (var i = 0; i < SHAPES.length; i++) {
      if (SHAPES[i].key === key) return SHAPES[i]
    }
    return SHAPES[0] // 默认四宫格
  }

  function clueRange(shapeKey) {
    return CLUE_RANGE[shapeKey] || CLUE_RANGE.s4
  }

  function clampClues(shapeKey, v) {
    var r = clueRange(shapeKey)
    var n = Math.round(Number(v))
    if (!Number.isFinite(n)) return r.def
    return Math.min(r.max, Math.max(r.min, n))
  }

  /*
   * 换盘型时把提示数搬过去：按「空格占比」等比映射，而不是原样带过去。
   * 四宫格 7 个提示是 9/16 = 56% 的格子要填；同样 56% 搬到六宫格是 20 个空、
   * 也就是 16 个提示 —— 难度感受接近，家长不用每换一次盘型就重新试。
   * 直接原样带过去的话，四宫格的 7 到了六宫格会被钳到下限 13，一换就变最难档。
   */
  function remapClues(clues, fromShape, toShape) {
    var a = shapeOf(fromShape)
    var b = shapeOf(toShape)
    var blankRatio = (a.n * a.n - clues) / (a.n * a.n)
    return clampClues(toShape, Math.round(b.n * b.n * (1 - blankRatio)))
  }

  /*
   * 预计算 peers 与 units，避免每次判断候选数都重算一遍坐标。
   *  - peers[i]：与格 i 同行 / 同列 / 同宫的所有格下标（不含 i 自己）
   *  - units：所有「必须含 1~n 各一次」的组，n 行 + n 列 + 若干宫
   * 结果按盘型 key 缓存，三种盘型各算一次就够。
   */
  var shapeCache = {}

  function board(key) {
    if (shapeCache[key]) return shapeCache[key]
    var sp = shapeOf(key)
    var n = sp.n
    var i, r, c, k, a, b, br, bc

    var peers = []
    for (i = 0; i < n * n; i++) {
      r = Math.floor(i / n)
      c = i % n
      var mark = {}
      for (k = 0; k < n; k++) {
        mark[r * n + k] = 1
        mark[k * n + c] = 1
      }
      if (sp.bh) {
        br = Math.floor(r / sp.bh) * sp.bh
        bc = Math.floor(c / sp.bw) * sp.bw
        for (a = 0; a < sp.bh; a++) {
          for (b = 0; b < sp.bw; b++) mark[(br + a) * n + bc + b] = 1
        }
      }
      delete mark[i]
      peers.push(Object.keys(mark).map(Number))
    }

    var units = []
    for (r = 0; r < n; r++) {
      var rowUnit = []
      for (c = 0; c < n; c++) rowUnit.push(r * n + c)
      units.push(rowUnit)
    }
    for (c = 0; c < n; c++) {
      var colUnit = []
      for (r = 0; r < n; r++) colUnit.push(r * n + c)
      units.push(colUnit)
    }
    if (sp.bh) {
      for (br = 0; br < n; br += sp.bh) {
        for (bc = 0; bc < n; bc += sp.bw) {
          var boxUnit = []
          for (a = 0; a < sp.bh; a++) {
            for (b = 0; b < sp.bw; b++) boxUnit.push((br + a) * n + bc + b)
          }
          units.push(boxUnit)
        }
      }
    }

    shapeCache[key] = { shape: sp, n: n, peers: peers, units: units }
    return shapeCache[key]
  }

  /* 格 i 还能填哪些数（行/列/宫里没出现过的） */
  function candidates(B, g, i) {
    var used = {}
    var ps = B.peers[i]
    for (var k = 0; k < ps.length; k++) {
      var v = g[ps[k]]
      if (v) used[v] = 1
    }
    var out = []
    for (var d = 1; d <= B.n; d++) {
      if (!used[d]) out.push(d)
    }
    return out
  }

  /*
   * 只用「唯一候选数」一招求解：反复扫全盘，找到候选只剩一个的空格就填。
   * 推不下去或出现候选为空的矛盾格就返回 null。
   *
   * 这里【绝对不能】加猜测分支——它是挖洞的验收标准，一旦能猜，
   * 挖出来的题就可能需要孩子试错，红线就破了。函数短也是有意的：
   * 越短越不容易写错，校验脚本里另写一套对照实现时也越好比。
   */
  function logicSolve(B, grid) {
    var g = grid.slice()
    var progress = true
    while (progress) {
      progress = false
      for (var i = 0; i < g.length; i++) {
        if (g[i]) continue
        var cs = candidates(B, g, i)
        if (cs.length === 0) return null
        if (cs.length === 1) {
          g[i] = cs[0]
          progress = true
        }
      }
    }
    for (var k = 0; k < g.length; k++) {
      if (!g[k]) return null
    }
    return g
  }

  function shuffle(arr, rnd) {
    for (var k = arr.length - 1; k > 0; k--) {
      var j = Math.floor(rnd() * (k + 1))
      var t = arr[k]
      arr[k] = arr[j]
      arr[j] = t
    }
    return arr
  }

  /* 随机生成一个完整解：按格顺序回溯，每格的候选顺序打乱以保证结果随机 */
  function fullGrid(B, rnd) {
    var g = new Array(B.n * B.n)
    for (var z = 0; z < g.length; z++) g[z] = 0

    function fill(i) {
      if (i === g.length) return true
      var cs = shuffle(candidates(B, g, i), rnd)
      for (var m = 0; m < cs.length; m++) {
        g[i] = cs[m]
        if (fill(i + 1)) return true
        g[i] = 0
      }
      g[i] = 0
      return false
    }

    fill(0)
    return g
  }

  /*
   * 挖一遍：随机顺序逐格试挖，挖掉后仍能只靠唯一候选数解完就真挖，否则放回去。
   * 挖到只剩 target 个提示就停——不挖到最少。要的是「稳稳能推出来」，
   * 不是「最少提示的硬核题」。
   *
   * 提前停止是安全的：多留一个提示只会让候选集更小、题目更简单，
   * 而挖的过程中每一步都已经用 logicSolve 验过了。
   */
  function digOnce(B, rnd, target) {
    var solution = fullGrid(B, rnd)
    var g = solution.slice()
    var left = g.length
    var order = []
    for (var z = 0; z < g.length; z++) order.push(z)
    shuffle(order, rnd)

    for (var k = 0; k < order.length && left > target; k++) {
      var i = order[k]
      var save = g[i]
      g[i] = 0
      if (logicSolve(B, g)) {
        left--
      } else {
        g[i] = save
      }
    }
    return { puzzle: g, solution: solution, clues: left }
  }

  /*
   * 挖不到目标就换一批随机顺序重挖，最多试 MAX_DIG_TRIES 次，取最接近的一次。
   *
   * 为什么要重挖：单挖一遍能不能到目标，很大程度上看运气——挖的顺序不巧，
   * 提前几格就卡住了。实测九宫格目标 28 个提示单挖只有 98.7% 命中，
   * 重挖后 100%；六宫格的下限更是从 13 一路压到 11。
   * 代价几乎为零：命中率高的档位平均只挖 1.0~1.1 次，一局一两毫秒。
   *
   * 这件事很重要，因为面板上的滑块承诺「写几个提示，卷子上就是几个」——
   * 下限就是按「重挖后 100% 命中」挑的，见 CLUE_RANGE。
   */
  var MAX_DIG_TRIES = 6

  function digTo(B, rnd, target) {
    var best = null
    for (var k = 0; k < MAX_DIG_TRIES; k++) {
      var d = digOnce(B, rnd, target)
      if (d.clues === target) return d
      if (!best || d.clues < best.clues) best = d
    }
    return best
  }

  /* 单局：按盘型 + 提示数出一道题 */
  function makeOne(shapeKey, clues, rnd) {
    var B = board(shapeKey)
    var d = digTo(B, rnd, clampClues(shapeKey, clues))
    return {
      shape: shapeKey,
      puzzle: d.puzzle,
      solution: d.solution,
      clues: d.clues,
      key: d.puzzle.join(',')
    }
  }

  /*
   * 主入口：按设置生成一批题目。
   * 去重按题面字符串。尝试上限 count × 50：四宫格 2000 次生成能得 1999 个不同题面，
   * 撞题率本来就极低，这个上限只是防死循环。
   */
  function generate(s) {
    var rnd = s.seed ? makeRandom(s.seed) : Math.random
    var seen = {}
    var puzzles = []
    var maxAttempts = s.count * 50

    for (var i = 0; i < maxAttempts && puzzles.length < s.count; i++) {
      var q = makeOne(s.shape, s.clues, rnd)
      if (s.noDuplicates && seen[q.key]) continue
      seen[q.key] = 1
      puzzles.push(q)
    }
    return { puzzles: puzzles, shortfall: s.count - puzzles.length }
  }

  /* 自动标题：如「四宫格数独 · 给 7 个提示」 */
  function titleFor(s) {
    return shapeOf(s.shape).name + '数独 · 给 ' + clampClues(s.shape, s.clues) + ' 个提示'
  }

  root.SumSum = root.SumSum || {}
  root.SumSum.shudu = {
    SHAPES: SHAPES,
    CLUE_RANGE: CLUE_RANGE,
    clueRange: clueRange,
    clampClues: clampClues,
    remapClues: remapClues,
    shapeOf: shapeOf,
    board: board,
    candidates: candidates,
    logicSolve: logicSolve,
    fullGrid: fullGrid,
    digTo: digTo,
    makeOne: makeOne,
    makeRandom: makeRandom,
    generate: generate,
    titleFor: titleFor
  }
})(typeof window !== 'undefined' ? window : globalThis)
