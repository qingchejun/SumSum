/**
 * 备份 / 搬家校验脚本。用法：node tools/check-backup.js
 *
 * 备份是「把旧网址上的进度搬到新网址」的唯一通道，出错的代价是孩子攒了几周的错字集没了，
 * 所以这里把三件事都压住：导出只带本站的数据、导入拒绝一切看着不对的文件、
 * 导出再导入之后本机数据一字不差。
 */
'use strict'

require('../js/backup.js')
var B = globalThis.SumSum.backup

var problems = []
function check(cond, msg) {
  if (!cond) problems.push(msg)
}

/* 最小的 localStorage 替身：只实现备份用到的 length / key / getItem / setItem */
function fakeStorage(init) {
  var m = Object.assign({}, init)
  return {
    get length() {
      return Object.keys(m).length
    },
    key: function (i) {
      return Object.keys(m)[i]
    },
    getItem: function (k) {
      return Object.prototype.hasOwnProperty.call(m, k) ? m[k] : null
    },
    setItem: function (k, v) {
      m[k] = String(v)
    },
    dump: function () {
      return Object.assign({}, m)
    }
  }
}

var WRONG = JSON.stringify({ 末: { add: '2026-09-20' }, 耸: { add: '2026-09-21', hit: '2026-09-22' }, 茁: { add: '2026-09-01', out: '2026-09-25' } })
var SITE = {
  'sumsum:shizi:wrong:v2': WRONG,
  'sumsum:shizi:v1': JSON.stringify({ week: 7, perWeek: 100 }),
  'sumsum:aoshu:learned:v1': JSON.stringify(['yiduobushao2', 'kuohao1', 'jiou']),
  'sumsum:aoshu:v1': JSON.stringify({ topic: 'jiou' }),
  'sumsum:settings:v1': JSON.stringify({ mode: 'add' }),
  'sumsum:shudu:v1': JSON.stringify({ shape: 's6' })
}

/* ---------- 导出 ---------- */

var src = fakeStorage(Object.assign({ 'sumsum:help:seen': '1', 'other-site:thing': 'x' }, SITE))
var pack = B.collect(src)
check(pack.app === 'lianxizhi' && pack.v === 1, '导出：缺少 app / v 标识')
check(typeof pack.at === 'string' && pack.at.length >= 10, '导出：缺少导出时间')
check(!('other-site:thing' in pack.data), '导出：带出了别的站的数据')
check(!('sumsum:help:seen' in pack.data), '导出：带出了「说明看过没」这种不该搬的标记')
check(Object.keys(pack.data).length === Object.keys(SITE).length, '导出：本站数据条数不对 ' + Object.keys(pack.data).length)
check(pack.data['sumsum:shizi:wrong:v2'] === WRONG, '导出：错字集内容被改动了')

/* ---------- 导入：往返一字不差 ---------- */

var text = JSON.stringify(pack)
var parsed = B.parse(text)
check(parsed.ok, '导入：合法备份被拒绝了：' + parsed.error)
var dst = fakeStorage({ 'sumsum:help:seen': '1', 'sumsum:shudu:v1': '{"shape":"s4"}', 'sumsum:only-here:v1': '"keep"' })
if (parsed.ok) {
  var n = B.apply(dst, parsed.data)
  check(n === Object.keys(SITE).length, '导入：写入条数不对 ' + n)
  Object.keys(SITE).forEach(function (k) {
    check(dst.getItem(k) === SITE[k], '导入：' + k + ' 往返后不一致')
  })
  check(dst.getItem('sumsum:only-here:v1') === '"keep"', '导入：把备份里没有的本机数据删掉了')
  check(dst.getItem('sumsum:help:seen') === '1', '导入：动了「说明看过没」标记')
}

/* ---------- 导入：给家长看的摘要 ---------- */

if (parsed.ok) {
  var lines = B.describe(parsed.data).join('\n')
  /* 茁 已在以前的某天移出（out 不是今天），只剩墓碑，不算在错字里 */
  check(/识字错字集.*2 个字/.test(lines), '摘要：错字数应为 2（移出的墓碑不算）：' + lines)
  check(/识字进度.*第 7 周/.test(lines), '摘要：没写出识字进度第 7 周：' + lines)
  check(/奥数.*已学.*3 个/.test(lines), '摘要：没写出奥数已学 3 个：' + lines)
  check(/设置/.test(lines), '摘要：没提到各板块设置：' + lines)
}

/* ---------- 导入：看着不对的文件一律拒绝，且给人话理由 ---------- */

function rejects(label, t) {
  var r = B.parse(t)
  check(!r.ok, '导入：应拒绝「' + label + '」却接受了')
  check(!r.ok && typeof r.error === 'string' && /[一-龥]/.test(r.error), '导入：「' + label + '」的拒绝理由不是人话')
}
function packWith(data, extra) {
  return JSON.stringify(Object.assign({ app: 'lianxizhi', v: 1, at: '2026-09-26T00:00:00Z', data: data }, extra || {}))
}
rejects('不是 JSON', '这不是备份文件')
rejects('空文件', '')
rejects('别的程序的 JSON', JSON.stringify({ hello: 'world' }))
rejects('app 不对', packWith(SITE, { app: 'other' }))
rejects('版本太新', packWith(SITE, { v: 99 }))
rejects('data 不是对象', packWith(['a']))
rejects('data 为空', packWith({}))
rejects('键不是本站的', packWith({ 'evil:key': '1' }))
rejects('夹带说明标记', packWith({ 'sumsum:help:seen': '1' }))
rejects('值不是字符串', packWith({ 'sumsum:shizi:v1': { week: 1 } }))
rejects('值不是合法 JSON', packWith({ 'sumsum:shizi:v1': '{week:' }))
rejects('过大的文件', packWith({ 'sumsum:shizi:v1': JSON.stringify('x'.repeat(3 * 1024 * 1024)) }))

/* 拒绝时不能动本机任何数据：parse 失败就根本走不到 apply，这里确认 apply 不会被半截数据调用 */
var untouched = fakeStorage(SITE)
var r = B.parse(packWith({ 'sumsum:shizi:v1': '{}', 'evil:key': '1' }))
if (r.ok) B.apply(untouched, r.data)
check(!r.ok, '导入：一条好一条坏时应整份拒绝，不能只导好的那条')

if (problems.length) {
  console.log('✗ ' + problems.length + ' 处问题：')
  problems.forEach(function (p) {
    console.log('  - ' + p)
  })
  process.exit(1)
}
console.log('✓ 备份校验全部通过')
