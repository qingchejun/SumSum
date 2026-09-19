/**
 * 奥数讲解页校验。用法：node tools/check-aoshu-lesson.js
 *
 * 这个脚本是为一个具体的毛病写的：【讲解页只讲第一种题型，卷子上却考三种】。
 * 40 个知识点全中，孩子照着讲解页做后面两种必错（16 间隔问题最典型：
 * 锯木头是「+1」、爬楼梯是「−1」、排一排又是「+1」，只讲锯木头等于漏掉两条规则）。
 *
 * 所以这里盯的不是排版，而是【讲解和出题是不是同一回事】：
 * 勾了哪几种题型，卷子上就只出哪几种，讲解页就只讲哪几种，三者必须完全相等。
 *
 * 与 check-shizi / check-shudu 一样是能用 node 直接跑的独立脚本（项目无测试框架）。
 * 排版高度这一层 node 里量不了（要真实 DOM），那部分只能在浏览器里扫，不在这里。
 */
'use strict'

globalThis.window = globalThis
/* 题型文件在模块顶层不碰 DOM，但 render.js 要一个壳 */
globalThis.document = {
  getElementById: function () { return null },
  querySelectorAll: function () { return [] },
  body: { classList: { remove: function () {}, add: function () {} } }
}

var fs = require('fs')
var path = require('path')
var JS = path.join(__dirname, '..', 'js')

require(path.join(JS, 'render.js'))
require(path.join(JS, 'aoshu-topics.js'))
fs.readdirSync(JS)
  .filter(function (f) { return /^aoshu-topic-/.test(f) })
  .forEach(function (f) { require(path.join(JS, f)) })

var A = globalThis.SumSum.aoshu
var U = A.util
var DIFFS = ['L1', 'L2', 'L3']

var problems = []
function bad(msg) { problems.push(msg) }

/* 按 OUTLINE 顺序，只取已实现的 */
function eachTopic(fn) {
  A.topicList.forEach(function (t) { fn(t) })
}

/* ---------- 1. 讲解页的数据形状 ---------- */

function checkShape() {
  eachTopic(function (t) {
    var l = t.lesson
    if (!l || !Array.isArray(l.sections)) { bad(t.no + ' 没有讲解页'); return }
    var pv = l.sections.filter(function (s) { return s.perVariant })
    if (pv.length !== 1) bad(t.no + ' ' + t.name + '：perVariant 段有 ' + pv.length + ' 个，应当恰好 1 个')
    l.sections.forEach(function (s, i) {
      /* 手写例题已全部撤掉，留着会和生成器悄悄走散 —— 这正是本次要修的病根 */
      if (s.example) bad(t.no + ' #' + i + ' 还留着手写 example')
      if (s.perVariant && (s.paras || s.chant || s.diagram)) {
        bad(t.no + ' #' + i + '：perVariant 段里不该再塞别的内容')
      }
    })
  })
}

/* ---------- 2. 例题取得到、认得对、钉得住 ---------- */

function checkExamples() {
  eachTopic(function (t) {
    t.variants.forEach(function (v) {
      DIFFS.forEach(function (d) {
        var s = { difficulty: d }
        var q = U.lessonExample(v, s)
        if (!q) { bad(t.no + ' ' + v.id + ' ' + d + '：取不到例题'); return }

        /* 张冠李戴是最要命的：例题标着「爬楼梯」，内容却是锯木头 */
        if (q.variant !== v.id) {
          bad(t.no + ' ' + v.id + ' ' + d + '：例题的 variant 是 ' + q.variant + '，对不上')
        }
        if (!q.stem || !q.solution || !q.solution.length) {
          bad(t.no + ' ' + v.id + ' ' + d + '：例题缺题干或解析')
        }
        /* 解析里必须有「答」，否则讲解页底下那行答句是空的 */
        if (!q.solution.some(function (st) { return st.tag === '答' })) {
          bad(t.no + ' ' + v.id + ' ' + d + '：例题解析里没有「答」')
        }

        /*
         * 钉得住：中间穿插一次普通出题（会消耗随机源），再取一次必须一模一样。
         * 这一条挂掉 ⇒ 点「重新生成一批」讲解页的例题会跟着变，
         * 孩子刚看懂的那道范例就没了。多半是哪个题型文件里漏了个 Math.random()。
         */
        var before = JSON.stringify(q)
        t.generate({ difficulty: d, count: 3 })
        if (JSON.stringify(U.lessonExample(v, s)) !== before) {
          bad(t.no + ' ' + v.id + ' ' + d + '：例题不稳定，出一次题就变了')
        }
      })
    })
  })
}

/* ---------- 3. 讲解 == 出题（本脚本的主角） ---------- */

/* variants 的所有非空子集，最多取 8 个，够覆盖又不至于跑爆 */
function subsets(variants) {
  var out = []
  var total = 1 << variants.length
  for (var m = 1; m < total; m++) {
    var pick = variants.filter(function (v, i) { return m & (1 << i) })
    out.push(pick)
  }
  return out.length > 8 ? out.slice(0, 8).concat([variants]) : out
}

function checkSameSet() {
  eachTopic(function (t) {
    subsets(t.variants).forEach(function (on) {
      DIFFS.forEach(function (d) {
        var s = { difficulty: d, count: 8 }
        t.variants.forEach(function (v) { s[v.setting] = false })
        on.forEach(function (v) { s[v.setting] = true })

        var want = on.map(function (v) { return v.id }).sort().join(',')

        /* 讲解页会讲哪几种 */
        var taught = U.selectedVariants(t.variants, s)
          .map(function (v) { return v.id }).sort().join(',')
        if (taught !== want) {
          bad(t.no + ' [' + want + '] ' + d + '：讲解页讲的是 [' + taught + ']')
        }

        /* 卷子上出了哪几种：必须是勾选集合的子集，一种都不许多出来 */
        var got = t.generate(s).questions
        var extra = got
          .map(function (q) { return q.variant })
          .filter(function (id, i, arr) { return arr.indexOf(id) === i })
          .filter(function (id) { return on.every(function (v) { return v.id !== id }) })
        if (extra.length) {
          bad(t.no + ' [' + want + '] ' + d + '：卷子上出现了没勾的题型 ' + extra.join(','))
        }
      })
    })
  })
}

/* ---------- 4. 随机源必须统一走 U.rand ---------- */

/*
 * 漏一处 Math.random()，那一处的例题就会每次都变（checkExamples 的稳定性一条
 * 能抓到症状，这一条直接指出病灶在哪个文件哪一行）。
 */
function checkRandomSource() {
  fs.readdirSync(JS)
    .filter(function (f) { return /^aoshu-topic/.test(f) })
    .forEach(function (f) {
      var src = fs.readFileSync(path.join(JS, f), 'utf8')
      src.split('\n').forEach(function (line, i) {
        if (/\bMath\.random\s*\(/.test(line) && !/^\s*\*/.test(line) && !/^\s*\/\//.test(line)) {
          bad(f + ':' + (i + 1) + ' 直接用了 Math.random()，应当改成 U.rand()')
        }
      })
    })
}

/* ---------- main ---------- */

function main() {
  var t0 = Date.now()
  console.log('已实现知识点：' + A.topicList.length + ' 个')
  var steps = [
    ['讲解页数据形状（perVariant 恰好一段、无遗留手写例题）', checkShape],
    ['例题取得到 / 认得对 / 出题后不变（知识点 × 题型 × 3 难度）', checkExamples],
    ['讲解讲的 == 卷子考的（题型子集全扫）', checkSameSet],
    ['随机源统一走 U.rand()', checkRandomSource]
  ]
  steps.forEach(function (st) {
    var before = problems.length
    st[1]()
    console.log((problems.length > before ? '✗' : '✓') + ' ' + st[0])
  })

  console.log('')
  if (problems.length) {
    console.log('✗ 发现 ' + problems.length + ' 处问题（最多列前 20 条）：')
    problems.slice(0, 20).forEach(function (m) { console.log('   · ' + m) })
    process.exit(1)
  }
  console.log('✓ 全部通过，耗时 ' + (Date.now() - t0) + 'ms')
  console.log('')
  console.log('注意：本脚本不量排版。「讲解页会不会溢出纸外、两页摊不摊得匀」')
  console.log('需要真实 DOM，只能在浏览器里扫，不在这里。')
}

main()
