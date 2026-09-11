/**
 * 数独题目生成（无 DOM 依赖，可在 node 中直接测试）。
 *
 * 三种盘型共用一套数据结构：棋盘是长度 n² 的一维数组，0 表示空格。
 *  - 三宫格 3×3：只有行、列两个约束（严格说是拉丁方，没有「宫」）
 *  - 四宫格 4×4：2×2 的宫
 *  - 六宫格 6×6：2 行 × 3 列的宫
 * 三宫格的「没有宫」靠 bh === 0 表达，不另写一套代码。
 *
 * 质量红线：每一局都必须能【只用「唯一候选数」一招】推到底——任何时刻棋盘上
 * 都至少存在一个空格，它的行/列/宫里已出现了除一个数以外的所有数。一年级的孩子
 * 一旦推不下去就会开始蒙，所以宁可题目简单，也绝不能出现「必须试探」的局面。
 * 挖洞时用 logicSolve 逐格验收，唯一解是白送的（每一步都是被逼出来的，
 * 不存在第二条路），不需要另外做唯一性检查。
 *
 * 题目对象：{ shape, puzzle, solution, clues, key }
 *  - shape：盘型 key，'s3' / 's4' / 's6'
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

  /*
   * 盘型定义。bh / bw = 宫的高 / 宽；bh 为 0 表示没有宫。
   * name 之外还给了 note：三宫格没有宫，规则和真正的数独不一样，
   * 界面上要明说，免得孩子形成「数独只要管行列」的错误印象。
   */
  var SHAPES = [
    { key: 's3', n: 3, bh: 0, bw: 0, name: '三宫格', label: '三宫格 3×3', note: '只看行和列' },
    { key: 's4', n: 4, bh: 2, bw: 2, name: '四宫格', label: '四宫格 4×4', note: '行、列、2×2 宫' },
    { key: 's6', n: 6, bh: 2, bw: 3, name: '六宫格', label: '六宫格 6×6', note: '行、列、2×3 宫' }
  ]

  /*
   * 难度 → 提示数。用「提示数」而不是「推理步数」当难度参数：提示数可以直接
   * 控制并且实测 2699/2700 局精确命中，而步数只能事后测量、没法当输入。
   * 这几个数是实测挑出来的——挑战档已经接近各盘型的理论下限
   * （贪心挖到最少：3×3 要 2~3 个、4×4 要 4~5 个、6×6 要 8~12 个）。
   */
  var CLUES = {
    s3: { easy: 5, normal: 4, hard: 3 },
    s4: { easy: 9, normal: 7, hard: 5 },
    s6: { easy: 20, normal: 16, hard: 12 }
  }

  var LEVELS = [
    { key: 'easy', name: '简单' },
    { key: 'normal', name: '普通' },
    { key: 'hard', name: '挑战' }
  ]

  function shapeOf(key) {
    for (var i = 0; i < SHAPES.length; i++) {
      if (SHAPES[i].key === key) return SHAPES[i]
    }
    return SHAPES[1] // 默认四宫格
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
   * 挖洞到目标提示数：随机顺序逐格试挖，挖掉后仍能只靠唯一候选数解完就真挖，
   * 否则放回去。挖到只剩 target 个提示就停——不挖到最少。一年级要的是
   * 「稳稳能推出来」，不是「最少提示的硬核题」。
   *
   * 提前停止是安全的：多留一个提示只会让候选集更小、题目更简单，
   * 而挖的过程中每一步都已经用 logicSolve 验过了。
   *
   * 实测 3 盘型 × 3 难度 × 300 局，2699/2700 精确命中目标提示数；唯一没命中的
   * 那局（六宫格挑战档）只是多留了 1 个提示，直接接受即可，不要加重试循环。
   */
  function digTo(B, rnd, target) {
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

  /* 单局：按盘型 + 难度出一道题 */
  function makeOne(shapeKey, level, rnd) {
    var B = board(shapeKey)
    var target = (CLUES[shapeKey] || CLUES.s4)[level]
    var d = digTo(B, rnd, target)
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
   * 去重按题面字符串——三宫格只有 12 个完整解，但普通档仍有近千种不同题面，
   * 实测 10 题一张卷 200 张里只有 6 张撞题，简单去重就够，不必特殊处理。
   * 尝试上限 count × 50：撞题率本来就极低，这个上限只是防死循环。
   */
  function generate(s) {
    var rnd = s.seed ? makeRandom(s.seed) : Math.random
    var seen = {}
    var puzzles = []
    var maxAttempts = s.count * 50

    for (var i = 0; i < maxAttempts && puzzles.length < s.count; i++) {
      var q = makeOne(s.shape, s.level, rnd)
      if (s.noDuplicates && seen[q.key]) continue
      seen[q.key] = 1
      puzzles.push(q)
    }
    return { puzzles: puzzles, shortfall: s.count - puzzles.length }
  }

  /* 自动标题：如「四宫格数独 · 普通」；三宫格顺带说明它只看行和列 */
  function titleFor(s) {
    var sp = shapeOf(s.shape)
    var levelName = '普通'
    for (var i = 0; i < LEVELS.length; i++) {
      if (LEVELS[i].key === s.level) levelName = LEVELS[i].name
    }
    if (sp.key === 's3') return sp.name + '数独 · ' + levelName + '（只看行和列）'
    return sp.name + '数独 · ' + levelName
  }

  /* 当前盘型该难度给几个提示，面板文案要用（「普通 · 给 7 个提示」） */
  function cluesFor(shapeKey, level) {
    return (CLUES[shapeKey] || CLUES.s4)[level]
  }

  root.SumSum = root.SumSum || {}
  root.SumSum.shudu = {
    SHAPES: SHAPES,
    LEVELS: LEVELS,
    CLUES: CLUES,
    shapeOf: shapeOf,
    board: board,
    candidates: candidates,
    logicSolve: logicSolve,
    fullGrid: fullGrid,
    digTo: digTo,
    makeOne: makeOne,
    makeRandom: makeRandom,
    generate: generate,
    titleFor: titleFor,
    cluesFor: cluesFor
  }
})(typeof window !== 'undefined' ? window : globalThis)
