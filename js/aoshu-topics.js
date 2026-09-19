/**
 * 奥数知识点注册表 + 公共工具 + 首个知识点「03 移多补少（基础篇）」
 * （无 DOM 依赖，可在 node 中直接测试）。
 *
 * 新增知识点时：新建 js/aoshu-topic-<id>.js（在本文件之后、aoshu-settings.js 之前加载），
 * 用 SumSum.aoshu.util 里的工具写生成器，往 SumSum.aoshu.topics / topicList 注册即可。
 * 知识点对象：{ id, no(大纲序号,如'03'), stage('L1'|'L2'), name(与大纲一致),
 *              lesson(讲解页内容), variants: [{id, setting, label, def?, gen}], generate, titleFor }
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
 *  - diagram:   可选圆点图 { rows: [{label, groups: [{type:'solid'|'hollow', n}]}], note }
 *  - key:       去重键 = 变式 + 参与数字（人名物品不参与：数字相同即视为同一道题）
 */
(function (root) {
  'use strict'

  /*
   * 随机源。默认就是 Math.random，出题时跟以前完全一样。
   *
   * 之所以要能换掉它：讲解页的例题是【从题型自己的生成器里现取的】——
   * 同一套代码产出的例题，绝不会教出一套卷子上不考的方法（讲解和出题脱节，
   * 正是这个板块此前最大的一个毛病：三种题型只讲第一种）。
   * 但例题必须【钉死】：点一次「重新生成一批」讲解页就换一道例题，
   * 孩子刚看懂的那道题没了，卷子也不再是同一张。所以取例题时用 withSeed
   * 换成定死的伪随机序列，出题时再换回来。
   *
   * 【所有知识点都必须走这个口子】：js/aoshu-topic-*.js 里一律用 U.rand()，
   * 不许再直接写 Math.random() —— 漏一处，那一处的例题就会每次都变。
   * tools/check-aoshu-lesson.js 里有一条专门盯着这件事。
   */
  var rnd = Math.random

  function rand() {
    return rnd()
  }

  /* mulberry32：与口算 js/generator.js 里用的是同一个，种子相同结果相同 */
  function makeRandom(seed) {
    var a = seed >>> 0
    return function () {
      a = (a + 0x6d2b79f5) | 0
      var t = Math.imul(a ^ (a >>> 15), 1 | a)
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
  }

  /*
   * 用定死的种子跑一段代码，跑完【无论如何】都换回原来的随机源。
   * 生成器里到处是 return null 的拒绝采样，try/finally 不能省。
   */
  function withSeed(seed, fn) {
    var prev = rnd
    rnd = makeRandom(seed)
    try {
      return fn()
    } finally {
      rnd = prev
    }
  }

  function randInt(min, max) {
    return Math.floor(rnd() * (max - min + 1)) + min
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

  /* 人名 → 代词（题干里「他/她」要跟人名性别一致） */
  var PRONOUN = {
    小明: '他', 小红: '她', 小华: '他', 小丽: '她', 乐乐: '他',
    天天: '他', 果果: '她', 朵朵: '她', 哥哥: '他', 妹妹: '她'
  }

  function pron(name) {
    return PRONOUN[name] || '他'
  }

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

  /* 难度档的文字标签，供不适合用「N 以内」描述的知识点拼标题 */
  var DIFF_LABEL = { L1: '入门', L2: '提高', L3: '挑战' }

  /*
   * 讲解页例题：从题型【自己的生成器】里取一道当范例。
   *
   * 不手写例题，是因为手写的那一份会和生成器悄悄走散 —— 生成器改了措辞或口径，
   * 讲解页还停在老版本，孩子照着做就是错的。同一套代码产出，这种事不可能发生。
   *
   * 挑法：先用一批固定种子各取一道，再挑出【数字最典型】的那一道 ——
   * 取的是这些候选里「最大数字」的中位数，不是最小的那个。
   *
   * 【刻意不挑最小】：挑最小会得到 4 和 2 这种退化的例子（差 2、移 1），
   * 孩子看完并不知道方法长什么样，一上卷子就懵。例题要的是「典型」，
   * 既不是这一档里最难的，也不能是送分的。同样大小时挑题干短的。
   *
   * 种子固定 ⇒ 例题固定：点「重新生成一批」换的是卷子上的题，讲解页不跟着变，
   * 孩子刚看懂的那道范例不会在下一次打印时消失。
   *
   * 逐个试而不是只试一个，是因为不少生成器用拒绝采样，单个种子常常返回 null
   *（实测 357 组里有 18 组在种子 7 上取不出题）。
   */
  var LESSON_SEEDS = 24

  /* 题干里最大的那个数：衡量这道题「有多大」最省事也最贴近孩子的感受 */
  function stemMax(q) {
    var max = 0
    ;(String(q.stem).match(/\d+/g) || []).forEach(function (t) {
      max = Math.max(max, Number(t))
    })
    return max
  }

  function lessonExample(variant, s) {
    var cand = []
    for (var seed = 1; seed <= LESSON_SEEDS; seed++) {
      var q = null
      try {
        q = withSeed(seed, function () {
          return variant.gen(s)
        })
      } catch (e) {
        q = null // 个别生成器在极端参数下会抛，跳过这个种子即可
      }
      if (q) cand.push(q)
    }
    if (!cand.length) return null
    var mid = cand
      .map(stemMax)
      .sort(function (a, b) {
        return a - b
      })[Math.floor(cand.length / 2)]
    var best = null
    var bestScore = Infinity
    cand.forEach(function (q) {
      /* 离中位数越近越好；一样近时取题干短的 */
      var sc = Math.abs(stemMax(q) - mid) * 1000 + String(q.stem).length
      if (sc < bestScore) {
        bestScore = sc
        best = q
      }
    })
    return best
  }

  /*
   * 通用生成循环：按设置过滤勾选的变式 → 拒绝采样 + key 去重。
   * 所有知识点的 generate 都是它的薄封装。
   */
  /*
   * 勾选了哪几种题型。出题和讲解页【必须走同一个函数】——
   * 两边各写一份 filter，迟早出现「卷子上考了第三种、讲解页没讲第三种」，
   * 而这正是这个板块修过的那个毛病本身。
   */
  function selectedVariants(variants, s) {
    var on = variants.filter(function (v) {
      return s[v.setting]
    })
    return on.length ? on : [variants[0]] // sanitize 已兜底，这里再防御一层
  }

  function generateFrom(variants, s) {
    var gens = selectedVariants(variants, s).map(function (v) {
      return v.gen
    })
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

  /* 移多补少的圆点对比图：●是共同的部分，○是多出来的部分 */
  function moveDiagram(A, B, b, gap, m, u) {
    return {
      rows: [
        { label: A, groups: [{ type: 'solid', n: b }, { type: 'hollow', n: gap }] },
        { label: B, groups: [{ type: 'solid', n: b }] }
      ],
      note: '○ 是多出来的 ' + gap + ' ' + u + '，移走一半（' + m + ' ' + u + '）给' + B + '，两人就一样多'
    }
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
      diagram: a <= 20 ? moveDiagram(A, B, b, gap, m, u) : null,
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
        diagram: moveDiagram('小明', '小红', 6, 4, 2, '颗')
      },
      {
        heading: '例题示范',
        perVariant: true
      },
      {
        heading: '记住口诀',
        chant: '先算差多少，再分一半移；一减一加后，两人一样多。'
      }
    ]
  }

  var YIDUOBUSHAO = {
    id: 'yiduobushao',
    no: '03',
    stage: 'L1',
    name: '移多补少（基础篇）',
    lesson: YIDUOBUSHAO_LESSON,
    variants: [
      { id: 'move', setting: 'vMove', label: '移几个才一样多', gen: genMove },
      { id: 'origDiff', setting: 'vOrigDiff', label: '移 n 个后一样多，求原差', gen: genOrigDiff },
      { id: 'afterDiff', setting: 'vAfterDiff', label: '移了几个后，还多几个', def: false, gen: genAfterDiff }
    ],
    generate: function (s) {
      return generateFrom(YIDUOBUSHAO.variants, s)
    },
    titleFor: function (s) {
      return '移多补少练习 · ' + diff(s).numMax + '以内'
    }
  }

  /*
   * 完整课程大纲（序号、名称与博主目录逐字一致）。
   * id 是每个知识点的固定标识：实现某个知识点时必须用这里的 id 注册，
   * 目录胶囊按钮按此渲染，未实现的显示为灰色「即将上线」。
   */
  var OUTLINE = [
    { no: '01', stage: 'L1', id: 'daxiao', name: '数的大小比较' },
    { no: '02', stage: 'L1', id: 'coushi', name: '凑十、平十和破十' },
    { no: '03', stage: 'L1', id: 'yiduobushao', name: '移多补少（基础篇）' },
    { no: '04', stage: 'L1', id: 'yiduobushao2', name: '移多补少（提高篇）' },
    { no: '05', stage: 'L1', id: 'tianfu', name: '巧填算符' },
    { no: '06', stage: 'L1', id: 'shuzimi', name: '数字谜问题（基础篇）' },
    { no: '07', stage: 'L1', id: 'shuzimi2', name: '数字谜问题（提高篇）' },
    { no: '08', stage: 'L1', id: 'xulie', name: '数列找规律' },
    { no: '09', stage: 'L1', id: 'tuxing', name: '图形找规律' },
    { no: '10', stage: 'L1', id: 'dengliang', name: '等量代换' },
    { no: '11', stage: 'L1', id: 'chongdie', name: '重叠问题' },
    { no: '12', stage: 'L1', id: 'meiju', name: '枚举法初步' },
    { no: '13', stage: 'L1', id: 'fendui', name: '分堆与枚举' },
    { no: '14', stage: 'L1', id: 'kongping', name: '空瓶换水' },
    { no: '15', stage: 'L1', id: 'huochai', name: '火柴棒游戏' },
    { no: '16', stage: 'L1', id: 'jiange', name: '间隔问题' },
    { no: '17', stage: 'L1', id: 'paidui', name: '排队问题' },
    { no: '18', stage: 'L1', id: 'xianjing', name: '趣味陷阱题' },
    { no: '19', stage: 'L1', id: 'fenzu', name: '合理分组问题' },
    { no: '20', stage: 'L1', id: 'hebubian', name: '和不变与差不变' },
    { no: '21', stage: 'L2', id: 'wenzimi', name: '加减法文字谜' },
    { no: '22', stage: 'L2', id: 'kuohao1', name: '加减法添去括号（一）' },
    { no: '23', stage: 'L2', id: 'kuohao2', name: '加减法添去括号（二）' },
    { no: '24', stage: 'L2', id: 'chengfa', name: '乘法的意义与性质' },
    { no: '25', stage: 'L2', id: 'chufa', name: '除法的三层含义' },
    { no: '26', stage: 'L2', id: 'size', name: '四则混合运算' },
    { no: '27', stage: 'L2', id: 'yushu1', name: '余数的应用（一）' },
    { no: '28', stage: 'L2', id: 'yushu2', name: '余数的应用（二）' },
    { no: '29', stage: 'L2', id: 'huajia', name: '化加为乘' },
    { no: '30', stage: 'L2', id: 'jiou', name: '奇数与偶数' },
    { no: '31', stage: 'L2', id: 'yibihua', name: '一笔作画问题' },
    { no: '32', stage: 'L2', id: 'jishu', name: '图形计数初步' },
    { no: '33', stage: 'L2', id: 'huanyuan', name: '还原问题初步' },
    { no: '34', stage: 'L2', id: 'tongchou', name: '统筹优化初步' },
    { no: '35', stage: 'L2', id: 'shuzhen', name: '数阵图初步' },
    { no: '36', stage: 'L2', id: 'cuozhong', name: '错中求解问题' },
    { no: '37', stage: 'L2', id: 'xianduan1', name: '线段图应用（一）' },
    { no: '38', stage: 'L2', id: 'xianduan2', name: '线段图应用（二）' },
    { no: '39', stage: 'L2', id: 'paixu', name: '排序推理' },
    { no: '40', stage: 'L2', id: 'liebiao', name: '列表推理' }
  ]

  root.SumSum = root.SumSum || {}
  root.SumSum.aoshu = root.SumSum.aoshu || {}
  root.SumSum.aoshu.OUTLINE = OUTLINE
  root.SumSum.aoshu.DIFFICULTY = DIFFICULTY
  /* 公共工具，供各知识点文件（js/aoshu-topic-*.js）复用 */
  root.SumSum.aoshu.util = {
    randInt: randInt,
    rand: rand,
    withSeed: withSeed,
    lessonExample: lessonExample,
    selectedVariants: selectedVariants,
    pick: pick,
    pickTwoNames: pickTwoNames,
    pron: pron,
    NAMES: NAMES,
    ITEMS: ITEMS,
    diff: diff,
    DIFF_LABEL: DIFF_LABEL,
    generateFrom: generateFrom
  }
  root.SumSum.aoshu.topics = { yiduobushao: YIDUOBUSHAO }
  root.SumSum.aoshu.topicList = [YIDUOBUSHAO]
})(typeof window !== 'undefined' ? window : globalThis)
