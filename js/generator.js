/**
 * 题目生成逻辑（无 DOM 依赖，可在 node 中直接测试）。
 *
 * 所有模式共用「拒绝采样」策略：随机取数 → 校验约束（范围 / 进退位 / 整除 / 非负）
 * → 不合格丢弃重试。尝试上限 count × 300，题库不足时返回 shortfall 由 UI 提示。
 *
 * 题目对象：{ tokens, answer, remainder, blank, key }
 *  - tokens：算式记号数组，数字为 number，运算符/括号为 string，如 [12, '+', 5]
 *  - answer：等号右侧的结果（带余数除法为商）
 *  - remainder：余数（仅带余数除法非 0）
 *  - blank：挖空位置，'ans' 表示挖结果，数字表示挖 tokens 中该下标的操作数
 */
(function (root) {
  'use strict'

  var OPS = ['+', '−', '×', '÷']

  function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min
  }

  function pick(arr) {
    return arr[randInt(0, arr.length - 1)]
  }

  /* 逐位相加判断是否产生进位（如 17+5：个位 7+5=12 ≥ 10 → 进位） */
  function hasCarry(a, b) {
    var x = a
    var y = b
    while (x > 0 || y > 0) {
      if ((x % 10) + (y % 10) >= 10) return true
      x = Math.floor(x / 10)
      y = Math.floor(y / 10)
    }
    return false
  }

  /* 逐位相减判断是否需要退位（要求 a ≥ b，如 23-5：个位 3 < 5 → 退位） */
  function hasBorrow(a, b) {
    var x = a
    var y = b
    while (y > 0) {
      if (x % 10 < y % 10) return true
      x = Math.floor(x / 10)
      y = Math.floor(y / 10)
    }
    return false
  }

  /*
   * 进退位约束：nocarry = 不允许进/退位；carryonly = 必须进/退位；
   * carrymore = 以进/退位为主（不进位的题按 30% 概率保留，卷面不至于太单调）；
   * random = 不限。
   */
  function carryOk(mode, flag) {
    if (mode === 'nocarry') return !flag
    if (mode === 'carryonly') return flag
    if (mode === 'carrymore') return flag || Math.random() < 0.3
    return true
  }

  /*
   * 送分题：加/减 0、自己减自己、乘/除 1、自己除自己——写上去就是答案，
   * 占了题量却练不到任何东西（实测「10以内加减」预设里占到 28%）。
   * 逐个运算步骤扫一遍，四则运算里夹着的 ×1、÷1 同样算送分。
   */
  function isTrivial(tokens) {
    for (var i = 1; i < tokens.length; i++) {
      var op = tokens[i]
      if (OPS.indexOf(op) < 0) continue
      var left = tokens[i - 1]
      var right = tokens[i + 1]
      var sameNum = typeof left === 'number' && left === right
      if (op === '+' && (left === 0 || right === 0)) return true
      if (op === '−' && (right === 0 || sameNum)) return true
      if (op === '×' && (left === 1 || right === 1 || left === 0 || right === 0)) return true
      if (op === '÷' && (right === 1 || sameNum)) return true
    }
    return false
  }

  function makeQuestion(tokens, answer, remainder) {
    return {
      tokens: tokens,
      answer: answer,
      remainder: remainder || 0,
      blank: 'ans',
      key: tokens.join(' ')
    }
  }

  /* 加法：两个加数 ∈ [min, max]，且和 ≤ max（"20 以内"＝参与数和结果都不超过 20）。
     先定和再拆成两个加数——若像原来那样先取 a、再在 [min, max-a] 里取 b，
     b 会被压得越来越小（实测 0~20 档近三成的 b 落在 0~1），答案也全堆在上限附近。
     当 2×min > max（无解）时恒返回 null，由 sanitize 提前钳位兜底。 */
  function genAdd(s) {
    if (s.min * 2 > s.max) return null
    var sum = randInt(s.min * 2, s.max)
    var a = randInt(s.min, sum - s.min)
    var b = sum - a
    if (!carryOk(s.carryMode, hasCarry(a, b))) return null
    return makeQuestion([a, '+', b], sum)
  }

  /* 减法：被减数、减数 ∈ [min, max]；默认不出负数（交换两数保证 a ≥ b） */
  function genSub(s) {
    var a = randInt(s.min, s.max)
    var b = randInt(s.min, s.max)
    if (!s.allowNegative && b > a) {
      var t = a
      a = b
      b = t
    }
    /* 允许负数且 a < b 时，退位按 |大 − 小| 判定（退位是数位概念，与符号无关） */
    var big = Math.max(a, b)
    var small = Math.min(a, b)
    if (!carryOk(s.carryMode, hasBorrow(big, small))) return null
    return makeQuestion([a, '−', b], a - b)
  }

  /* 乘法：两个因数 ∈ [mulMin, mulMax]（默认 1~9，即九九乘法表范围） */
  function genMul(s) {
    var a = randInt(s.mulMin, s.mulMax)
    var b = randInt(s.mulMin, s.mulMax)
    return makeQuestion([a, '×', b], a * b)
  }

  /*
   * 除法：反向构造，保证可控。先取除数 d、商 q ∈ [mulMin, mulMax]：
   *  - 整除模式：被除数 = d × q
   *  - 带余数模式：再取余数 r ∈ [0, d-1]，被除数 = d × q + r，答案显示「q……r」
   */
  function genDiv(s) {
    var d = randInt(Math.max(1, s.mulMin), s.mulMax)
    var q = randInt(s.mulMin, s.mulMax)
    if (s.exactDivision) return makeQuestion([d * q, '÷', d], q)
    var r = randInt(0, d - 1)
    return makeQuestion([d * q + r, '÷', d], q, r)
  }

  /*
   * 带校验的求值器（递归下降，支持括号和乘除优先级）。
   * 任何一步中间结果出现非整数、除数为 0、负数（未允许时）或超出 [0, cap]
   * 都返回 null —— 让上层丢弃这道题重新生成。
   */
  function safeEval(tokens, opts) {
    var pos = 0

    function ok(v) {
      var low = opts.allowNegative ? -opts.cap : 0
      return Number.isInteger(v) && v >= low && v <= opts.cap
    }

    function parseExpr() {
      var v = parseTerm()
      if (v === null) return null
      while (tokens[pos] === '+' || tokens[pos] === '−') {
        var op = tokens[pos++]
        var r = parseTerm()
        if (r === null) return null
        v = op === '+' ? v + r : v - r
        if (!ok(v)) return null
      }
      return v
    }

    function parseTerm() {
      var v = parseFactor()
      if (v === null) return null
      while (tokens[pos] === '×' || tokens[pos] === '÷') {
        var op = tokens[pos++]
        var r = parseFactor()
        if (r === null) return null
        if (op === '×') {
          v = v * r
        } else {
          if (r === 0 || v % r !== 0) return null
          v = v / r
        }
        if (!ok(v)) return null
      }
      return v
    }

    function parseFactor() {
      if (tokens[pos] === '(') {
        pos++
        var v = parseExpr()
        if (v === null || tokens[pos] !== ')') return null
        pos++
        return v
      }
      var t = tokens[pos++]
      return typeof t === 'number' ? t : null
    }

    var result = parseExpr()
    return result !== null && pos === tokens.length && ok(result) ? result : null
  }

  /* 给第 p 与 p+1 个操作数加括号：操作数 i 位于扁平记号数组的下标 2i 处 */
  function insertParens(tokens, p) {
    var at = 2 * p
    return tokens
      .slice(0, at)
      .concat(['('], tokens.slice(at, at + 3), [')'], tokens.slice(at + 3))
  }

  /*
   * 四则运算：随机 2~3 步、随机运算符。
   * 取数规则：紧邻 ×÷ 的操作数取 [mulMin, mulMax]，其余取 [min, max]；
   * 可选随机加括号。生成后交给 safeEval 验证每一步中间结果都合法
   * （表达式内的除法必须整除 —— 多步算式无法表示余数，exactDivision 不适用）。
   */
  function genMixed(s) {
    var steps = randInt(2, 3)
    var ops = []
    for (var i = 0; i < steps; i++) ops.push(pick(OPS))

    function isMulDiv(op) {
      return op === '×' || op === '÷'
    }

    /*
     * ×÷ 的操作数上限还要再受结果范围压一道：比 s.max 大的因数不可能凑出
     * ≤ s.max 的积，safeEval 会把整道题否掉。若不压这一道，用户把「乘除数
     * 范围」调到大于「数值范围」时，乘除步骤几乎全军覆没，拿到的是一张
     * 没有乘除的「四则运算」卷，且毫无提示。
     */
    var mulHi = Math.max(s.mulMin, Math.min(s.mulMax, s.max))

    var nums = []
    for (var j = 0; j <= steps; j++) {
      var nearMulDiv =
        (j > 0 && isMulDiv(ops[j - 1])) || (j < steps && isMulDiv(ops[j]))
      if (!nearMulDiv) {
        nums.push(randInt(s.min, s.max))
        continue
      }
      /* 紧跟在 × 右边的因数再按左边已定的因数收一收，让乘积有机会落进 s.max */
      var hi = mulHi
      if (j > 0 && ops[j - 1] === '×' && nums[j - 1] > 0) {
        hi = Math.max(s.mulMin, Math.min(hi, Math.floor(s.max / nums[j - 1])))
      }
      nums.push(randInt(s.mulMin, hi))
    }

    var tokens = []
    nums.forEach(function (n, k) {
      if (k > 0) tokens.push(ops[k - 1])
      tokens.push(n)
    })
    if (s.parens && Math.random() < 0.5) {
      tokens = insertParens(tokens, randInt(0, steps - 1))
    }

    var answer = safeEval(tokens, { cap: s.max, allowNegative: s.allowNegative })
    if (answer === null) return null
    return makeQuestion(tokens, answer)
  }

  var GENERATORS = {
    add: [genAdd],
    sub: [genSub],
    addsub: [genAdd, genSub],
    mul: [genMul],
    div: [genDiv],
    muldiv: [genMul, genDiv],
    mixed: [genMixed]
  }

  /*
   * 随机挖空：仅对三元算式（a ⊕ b = c）挖 a、b 或结果之一；
   * 带余数除法和四则题只挖结果（否则答案不唯一或过难）。
   */
  function applyBlank(q, s) {
    if (s.blankMode !== 'random') return q
    if (q.tokens.length !== 3 || q.remainder !== 0) return q
    return Object.assign({}, q, { blank: pick(['ans', 0, 2]) })
  }

  /* 主入口：按设置生成一批题目 */
  function generate(s) {
    var gens = GENERATORS[s.mode] || GENERATORS.addsub
    var seen = new Set()
    var questions = []
    var maxAttempts = s.count * 300

    for (var i = 0; i < maxAttempts && questions.length < s.count; i++) {
      var raw = pick(gens)(s)
      if (!raw) continue
      if (s.skipTrivial && isTrivial(raw.tokens)) continue
      var q = applyBlank(raw, s)
      var key = q.key + '#' + q.blank
      if (s.noDuplicates && seen.has(key)) continue
      seen.add(key)
      questions.push(q)
    }
    return { questions: questions, shortfall: s.count - questions.length }
  }

  /* 自动标题：如「20以内加减法练习」「乘法口诀练习」 */
  function titleFor(s) {
    var NAMES = {
      add: '加法',
      sub: '减法',
      addsub: '加减法',
      mul: '乘法',
      div: '除法',
      muldiv: '乘除法',
      mixed: '四则混合运算'
    }
    if (s.mode === 'mul' && s.mulMin >= 1 && s.mulMax <= 9) return '乘法口诀练习'
    if (s.mode === 'add' || s.mode === 'sub' || s.mode === 'addsub') {
      return s.max + '以内' + NAMES[s.mode] + '练习'
    }
    return NAMES[s.mode] + '练习'
  }

  root.SumSum = root.SumSum || {}
  root.SumSum.generator = { generate: generate, titleFor: titleFor }
})(typeof window !== 'undefined' ? window : globalThis)
