/**
 * 识字板块的核心：把一整张字表按「第几周」切出该印的那一批字。
 *
 * 这个板块没有随机、没有生成算法 —— 字表是固定的、顺序是洪恩排好的、
 * 复习就是照着顺序一周一批走过去，所以这里全是纯粹的下标计算。
 * 正因为简单，反而容易在边界上出错（最后一周、越界的周次、每周字数被改过之后
 * 原来的周次还指向哪里），边界都在 sliceOf / clampWeek 里收口。
 *
 * 无 DOM 依赖，node 里可直接 require（tools/check-shizi.js 靠这一点）。
 */
(function (root) {
  'use strict'

  /*
   * 纳入复习的字数。字表原始有 1620 字（9 屏 × 180），孩子在洪恩上学到第 1595 字，
   * 取整到 1600 —— 正好 16 周 × 100 字，不用处理「最后一周只有 95 个字、
   * 格子要不要跟着变大」这种一次性的碎问题。
   * 将来想把剩下的 20 字也纳进来，改这一个数即可（周次会自动变成 17 周）。
   */
  var TOTAL = 1600

  function list() {
    return root.SumSum.shiziData.LIST
  }

  /* 实际参与复习的字表（前 TOTAL 个）。字表比 TOTAL 短时以字表为准，不会越界。 */
  function pool() {
    return list().slice(0, Math.min(TOTAL, list().length))
  }

  function poolSize() {
    return Math.min(TOTAL, list().length)
  }

  /* 每周 perWeek 个字，一共要走几周。末周不满也算一周。 */
  function totalWeeks(perWeek) {
    var n = Math.max(1, perWeek | 0)
    return Math.max(1, Math.ceil(poolSize() / n))
  }

  function clampWeek(week, perWeek) {
    var w = Math.round(Number(week) || 1)
    return Math.min(totalWeeks(perWeek), Math.max(1, w))
  }

  /*
   * 第 week 周该印哪些字。
   * from / to 是给人看的序号（1 起算，闭区间），chars 是字符数组。
   * 末周不满时 chars.length < perWeek —— 渲染层要按 chars.length 排版，
   * 不能按 perWeek 排，否则末页会多出一片空格子。
   */
  function sliceOf(week, perWeek) {
    var n = Math.max(1, perWeek | 0)
    var w = clampWeek(week, n)
    var start = (w - 1) * n
    var chars = pool().slice(start, start + n)
    return {
      week: w,
      weeks: totalWeeks(n),
      from: start + 1,
      to: start + chars.length,
      chars: chars
    }
  }

  /*
   * 换每周字数时，周次怎么跟着搬。
   *
   * week 存的是序数不是字序，所以光改 perWeek 会让同一个 week 指向完全不同的字：
   * 第 16 周在「每周 100 字」下是第 1501–1600 字，在「每周 50 字」下却成了第 751–800 字，
   * 复习进度凭空倒退 750 个字。正确做法是【停在同一个字上】：取当前这周的起始字序，
   * 算出在新的每周字数下，包含这个字的是第几周。
   *
   * 放在 core 而不是 main，与数独的 remapClues 一样 —— 一来这是纯计算，
   * 二来放 main 里 tools/check-shizi.js 就够不着了（main 依赖 DOM）。
   */
  function remapWeek(week, fromPerWeek, toPerWeek) {
    var to = Math.max(1, toPerWeek | 0)
    var from = sliceOf(week, fromPerWeek).from // 当前这周的起始字序，1 起算
    return clampWeek(Math.floor((from - 1) / to) + 1, to)
  }

  /* 练习纸标题。用户在面板上填了标题就用他的，这里只管默认的那一行。 */
  function titleFor(s) {
    var sl = sliceOf(s.week, s.perWeek)
    return '识字复习 · 第 ' + sl.week + ' 周（第 ' + sl.from + '–' + sl.to + ' 字）'
  }

  root.SumSum = root.SumSum || {}
  root.SumSum.shizi = {
    TOTAL: TOTAL,
    pool: pool,
    poolSize: poolSize,
    totalWeeks: totalWeeks,
    clampWeek: clampWeek,
    remapWeek: remapWeek,
    sliceOf: sliceOf,
    titleFor: titleFor
  }
})(typeof window !== 'undefined' ? window : globalThis)
