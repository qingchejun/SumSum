#!/usr/bin/env node
/*
 * 校验 shell.js 的「打印文件名加时间戳」：
 *   beforeprint → 标题拼上 年月日-时分秒；afterprint → 还原；连环触发不叠加。
 * 用打桩的 window/document 直接加载 js/shell.js，不依赖浏览器。
 */
'use strict'

var fs = require('fs')
var path = require('path')

var failures = []
var cases = 0

function ok(name, cond, detail) {
  cases++
  if (!cond) failures.push(name + (detail ? '：' + detail : ''))
}

/* ---- 打桩：shell.js 首屏只会用到这几样 ---- */
var listeners = {}
function on(scope, type, fn) {
  var k = scope + ':' + type
  ;(listeners[k] = listeners[k] || []).push(fn)
}
function fire(scope, type) {
  ;(listeners[scope + ':' + type] || []).forEach(function (fn) { fn() })
}

var doc = {
  title: '口算 · 练习纸',
  addEventListener: function (t, fn) { on('doc', t, fn) },
  querySelectorAll: function () { return [] },
  getElementById: function () { return null },
  querySelector: function () { return null }
}

var win = {
  document: doc,
  location: { hash: '' },
  addEventListener: function (t, fn) { on('win', t, fn) },
  getComputedStyle: function () { return {} }
}

new Function('window', fs.readFileSync(path.join(__dirname, '../js/shell.js'), 'utf8'))(win)

/* ---- beforeprint：拼上时间戳 ---- */
var re = /^口算 · 练习纸 · \d{4}\d{2}\d{2}-\d{2}\d{2}\d{2}$/
fire('win', 'beforeprint')
ok('打印中标题带 年月日-时分秒', re.test(doc.title), '实际是 ' + doc.title)

/* 打印中再来一次 beforeprint（不该叠加第二遍时间戳） */
fire('win', 'beforeprint')
ok('打印中重复触发不叠加', doc.title.match(/·/g).length === 2, '实际是 ' + doc.title)

/* ---- afterprint：还原 ---- */
fire('win', 'afterprint')
ok('打印后标题还原', doc.title === '口算 · 练习纸', '实际是 ' + doc.title)

/* 没在打印时 afterprint（不该把标题改没） */
fire('win', 'afterprint')
ok('未打印时还原是空操作', doc.title === '口算 · 练习纸', '实际是 ' + doc.title)

/* ---- 再来一轮，时间戳应当是新的 ---- */
fire('win', 'beforeprint')
var first = doc.title
fire('win', 'afterprint')
/* 强制跨过一秒再打印，两次时间戳必然不同 */
setTimeout(function () {
  fire('win', 'beforeprint')
  ok('两次打印时间戳不同', doc.title !== first, first + ' vs ' + doc.title)
  fire('win', 'afterprint')

  if (failures.length) {
    console.error('✗ 打印文件名加时间戳：' + failures.join(' / '))
    process.exit(1)
  }
  console.log('✓ 打印文件名加时间戳：拼时间戳 / 不叠加 / 还原 / 空操作 / 换新 全部通过')
}, 1100)
