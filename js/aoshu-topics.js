/**
 * 奥数知识点注册表 + 各知识点的出题生成器与解析模板（无 DOM 依赖，可在 node 中直接测试）。
 *
 * 本文件目前只有「移多补少（基础篇）」。后续新增知识点时：
 * 新建 js/aoshu-topic-<id>.js，自行往 SumSum.aoshu.topics / topicList 注册，
 * 并在 aoshu.html 里加一个 script 标签即可，无需改动本文件之外的框架代码。
 *
 * 奥数题对象（文字应用题，与口算的 tokens 模型不同）：
 *  - topic:     知识点 id
 *  - variant:   变式 id
 *  - stem:      题干文字（人名/物品/数字已代入）
 *  - answer:    数值答案
 *  - unit:      量词（如「颗」）
 *  - ansLabel:  答句前缀（如「答：小明给小红」），后接挖空
 *  - ansSuffix: 答句后缀（如「颗糖，两人就一样多。」）
 *  - solution:  分步解析 [{ tag: '想一想', text: '…' }, ...]
 *  - key:       去重键 = 变式 + 参与数字（人名物品不参与：数字相同即视为同一道题）
 */
(function (root) {
  'use strict'

  function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min
  }

  function pick(arr) {
    return arr[randInt(0, arr.length - 1)]
  }

  /* 随机抽两个不同人名 */
  function pickTwoNames() {
    var a = pick(NAMES)
    var b = pick(NAMES)
    while (b === a) b = pick(NAMES)
    return [a, b]
  }

  var NAMES = ['小明', '小红', '小华', '小丽', '乐乐', '天天', '果果', '朵朵', '哥哥', '妹妹']

  var ITEMS = [
    { n: '糖', u: '颗' },
    { n: '苹果', u: '个' },
    { n: '贴纸', u: '张' },
    { n: '弹珠', u: '颗' },
    { n: '积木', u: '块' },
    { n: '铅笔', u: '支' },
    { n: '气球', u: '个' },
    { n: '卡片', u: '张' }
  ]

  /* 难度分档：numMax 数量上限，moveMax 移动数上限 */
  var DIFFICULTY = {
    L1: { numMax: 20, moveMax: 4 },
    L2: { numMax: 50, moveMax: 9 },
    L3: { numMax: 100, moveMax: 15 }
  }

  function diff(s) {
    return DIFFICULTY[s.difficulty] || DIFFICULTY.L1
  }

  /*
   * 变式①「移几个才一样多」：已知两人数量，求移动数。
   * 反向构造：先取移动数 m → 差 d = 2m（差必为偶数，否则移不平）→
   * 取小数 b → 大数 a = b + d，天然满足全部数学约束，几乎不拒绝。
   */
  function genMove(s) {
    var d0 = diff(s)
    var m = randInt(1, d0.moveMax)
    var gap = 2 * m
    if (d0.numMax - gap < 1) return null
    var b = randInt(1, d0.numMax - gap)
    var a = b + gap
    var who = pickTwoNames()
    var it = pick(ITEMS)
    var A = who[0]
    var B = who[1]
    var u = it.u
    var half =
      '多的分一半：' + gap + ' = ' + m + ' + ' + m + '，把多出的 ' + gap + ' ' + u +
      '平分成两份，给' + B + '一份，就是 ' + m + ' ' + u +
      (s.difficulty === 'L1' ? '。' : '（也就是 ' + gap + ' ÷ 2 = ' + m + '）。')
    return {
      topic: 'yiduobushao',
      variant: 'move',
      stem:
        A + '有 ' + a + ' ' + u + it.n + '，' + B + '有 ' + b + ' ' + u + it.n + '。' +
        A + '给' + B + '几' + u + it.n + '，两人的' + it.n + '就一样多？',
      answer: m,
      unit: u,
      ansLabel: '答：' + A + '给' + B,
      ansSuffix: u + it.n + '，两人就一样多。',
      /* 解析页的圆点对比图（一年级看图最直观）；数字大了画不下，只在 ≤20 时给 */
      diagram: a <= 20 ? { A: A, B: B, b: b, gap: gap, m: m, u: u } : null,
      solution: [
        { tag: '想一想', text: '要让两人一样多，就要把' + A + '「多出来的部分」分一半给' + B + '。' },
        { tag: '第 1 步', text: '先算多多少：' + a + ' − ' + b + ' = ' + gap + '（' + u + '），' + A + '比' + B + '多 ' + gap + ' ' + u + it.n + '。' },
        { tag: '第 2 步', text: half },
        { tag: '验一验', text: A + ' ' + a + ' − ' + m + ' = ' + (a - m) + '（' + u + '），' + B + ' ' + b + ' + ' + m + ' = ' + (b + m) + '（' + u + '），两人都是 ' + (a - m) + ' ' + u + '，一样多 ✓' },
        { tag: '答', text: A + '给' + B + ' ' + m + ' ' + u + it.n + '。' }
      ],
      key: 'move:' + a + ',' + b
    }
  }

  /*
   * 变式②「移 n 个后一样多，求原来多多少」：答案 = 2n。
   * 暗取一组 b、a = b + 2n，只用于解析里「假设」的验算文案。
   */
  function genOrigDiff(s) {
    var d0 = diff(s)
    var n = randInt(1, d0.moveMax)
    var gap = 2 * n
    if (d0.numMax - gap < 1) return null
    var b = randInt(1, d0.numMax - gap)
    var a = b + gap
    var who = pickTwoNames()
    var it = pick(ITEMS)
    var A = who[0]
    var B = who[1]
    var u = it.u
    return {
      topic: 'yiduobushao',
      variant: 'origDiff',
      stem:
        A + '给了' + B + ' ' + n + ' ' + u + it.n + '以后，两人的' + it.n + '正好一样多。' +
        '原来' + A + '比' + B + '多几' + u + it.n + '？',
      answer: gap,
      unit: u,
      ansLabel: '答：原来' + A + '比' + B + '多',
      ansSuffix: u + it.n + '。',
      solution: [
        { tag: '想一想', text: A + '给出 ' + n + ' ' + u + '，自己少了 ' + n + ' ' + u + '，' + B + '同时多了 ' + n + ' ' + u + '——一给一收，差距缩小的是「两个 ' + n + '」。' },
        { tag: '列算式', text: n + ' + ' + n + ' = ' + gap + '（' + u + '）。' },
        { tag: '验一验', text: '假设原来' + A + '有 ' + a + ' ' + u + '、' + B + '有 ' + b + ' ' + u + '，正好相差 ' + gap + ' ' + u + '；' + A + '给 ' + n + ' ' + u + '后，两人都是 ' + (a - n) + ' ' + u + ' ✓' },
        { tag: '答', text: '原来' + A + '比' + B + '多 ' + gap + ' ' + u + it.n + '。' }
      ],
      key: 'origDiff:' + n
    }
  }

  /*
   * 变式③「移了几个后，还多几个」：原差 d、移 n 个，答案 r = d − 2n。
   * 反向构造：取 n ≥ 1、剩余差 r ≥ 1（即答案），d = 2n + r，保证不出「反超」题。
   */
  function genAfterDiff(s) {
    var d0 = diff(s)
    var n = randInt(1, d0.moveMax)
    if (d0.numMax - 2 * n < 1) return null
    var r = randInt(1, d0.numMax - 2 * n)
    var gap = 2 * n + r
    if (d0.numMax - gap < 1) return null
    var b = randInt(1, d0.numMax - gap)
    var a = b + gap
    var who = pickTwoNames()
    var it = pick(ITEMS)
    var A = who[0]
    var B = who[1]
    var u = it.u
    return {
      topic: 'yiduobushao',
      variant: 'afterDiff',
      stem:
        A + '的' + it.n + '比' + B + '多 ' + gap + ' ' + u + '。' +
        A + '给了' + B + ' ' + n + ' ' + u + it.n + '，现在' + A + '还比' + B + '多几' + u + it.n + '？',
      answer: r,
      unit: u,
      ansLabel: '答：现在' + A + '还比' + B + '多',
      ansSuffix: u + it.n + '。',
      solution: [
        { tag: '想一想', text: A + '给出 ' + n + ' ' + u + '，自己少 ' + n + ' ' + u + '、' + B + '多 ' + n + ' ' + u + '，差距一下子缩小了 ' + n + ' + ' + n + ' = ' + 2 * n + ' ' + u + '。' },
        { tag: '列算式', text: gap + ' − ' + 2 * n + ' = ' + r + '（' + u + '）。' },
        { tag: '验一验', text: '假设' + A + '有 ' + a + ' ' + u + '、' + B + '有 ' + b + ' ' + u + '（相差 ' + gap + '）；给 ' + n + ' ' + u + '后是 ' + (a - n) + ' ' + u + '和 ' + (b + n) + ' ' + u + '，还差 ' + r + ' ' + u + ' ✓' },
        { tag: '答', text: '现在还是' + A + '多，多 ' + r + ' ' + u + it.n + '。' }
      ],
      key: 'afterDiff:' + gap + ',' + n
    }
  }

  /*
   * 知识点讲解页内容（手工编写的固定内容，不随机）。
   * 渲染成练习纸的第一页：概念 → 思路（配圆点图）→ 例题示范 → 口诀。
   * section 支持的字段：paras 段落数组 / diagram 圆点图 / example 例题 / chant 口诀。
   */
  var YIDUOBUSHAO_LESSON = {
    title: '移多补少 · 方法讲解',
    sections: [
      {
        heading: '这是什么问题？',
        paras: [
          '两个人的东西不一样多，从多的一方拿一些给少的一方，让两人变得一样多——这就是「移多补少」。'
        ]
      },
      {
        heading: '怎么想？',
        paras: [
          '关键在「差的一半」：每移过去 1 个，多的人少 1 个、少的人同时多 1 个，差距一下子缩小 2 个。所以只要先算出两人相差多少，再把差分成两半，移走一半，正好补平。'
        ],
        diagram: { A: '小明', B: '小红', b: 6, gap: 4, m: 2, u: '颗' }
      },
      {
        heading: '例题示范',
        example: {
          stem: '小明有 10 颗糖，小红有 6 颗糖。小明给小红几颗糖，两人的糖就一样多？',
          solution: [
            { tag: '想一想', text: '要让两人一样多，就要把小明「多出来的部分」分一半给小红。' },
            { tag: '第 1 步', text: '先算多多少：10 − 6 = 4（颗），小明比小红多 4 颗糖。' },
            { tag: '第 2 步', text: '多的分一半：4 = 2 + 2，把多出的 4 颗平分成两份，给小红一份，就是 2 颗。' },
            { tag: '验一验', text: '小明 10 − 2 = 8（颗），小红 6 + 2 = 8（颗），两人都是 8 颗，一样多 ✓' },
            { tag: '答', text: '小明给小红 2 颗糖。' }
          ]
        }
      },
      {
        heading: '记住口诀',
        chant: '先算差多少，再分一半移；一减一加后，两人一样多。'
      }
    ]
  }

  var YIDUOBUSHAO = {
    id: 'yiduobushao',
    name: '移多补少（基础）',
    lesson: YIDUOBUSHAO_LESSON,
    variants: [
      { id: 'move', setting: 'vMove', label: '移几个才一样多', gen: genMove },
      { id: 'origDiff', setting: 'vOrigDiff', label: '移 n 个后一样多，求原差', gen: genOrigDiff },
      { id: 'afterDiff', setting: 'vAfterDiff', label: '移了几个后，还多几个', gen: genAfterDiff }
    ],
    generate: generate,
    titleFor: titleFor
  }

  /* 主入口：按设置生成一批题（拒绝采样 + key 去重，与口算 generator 同一套路） */
  function generate(s) {
    var gens = YIDUOBUSHAO.variants
      .filter(function (v) {
        return s[v.setting]
      })
      .map(function (v) {
        return v.gen
      })
    if (gens.length === 0) gens = [genMove] // sanitize 已兜底，这里再防御一层
    var seen = new Set()
    var questions = []
    var maxAttempts = s.count * 300

    for (var i = 0; i < maxAttempts && questions.length < s.count; i++) {
      var q = pick(gens)(s)
      if (!q) continue
      if (seen.has(q.key)) continue
      seen.add(q.key)
      questions.push(q)
    }
    return { questions: questions, shortfall: s.count - questions.length }
  }

  function titleFor(s) {
    return '移多补少练习 · ' + diff(s).numMax + '以内'
  }

  root.SumSum = root.SumSum || {}
  root.SumSum.aoshu = root.SumSum.aoshu || {}
  root.SumSum.aoshu.DIFFICULTY = DIFFICULTY
  root.SumSum.aoshu.topics = { yiduobushao: YIDUOBUSHAO }
  root.SumSum.aoshu.topicList = [YIDUOBUSHAO]
})(typeof window !== 'undefined' ? window : globalThis)
