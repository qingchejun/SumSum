/**
 * 「今天」首页校验脚本。用法：node tools/check-today.js
 *
 * 首页的四张卡片全靠读各板块存在浏览器里的数据拼出来，读错的代价是家长点「打印」
 * 印出来的和卡片上写的不是一回事。所以这里压住：
 *   - 空浏览器（第一次来）每张卡都有合理的默认内容，不报错；
 *   - 奥数「接着学」指向大纲顺序里第一个没学的，全学完了改成综合复习；
 *   - 有视频的课标出时长，没视频的不标；
 *   - 识字的周次、字序区间、错字数和板块页上算的一致（已移出的不算错字）；
 *   - 口算 / 数独的摘要来自上次的设置，命中预设时用预设名；
 *   - 数据被改坏（不是 JSON、字段乱填）时退回默认值，不抛异常。
 */
'use strict'

/* 板块脚本都是「挂到 root.SumSum 上」的写法，node 下 root 就是 globalThis */
require('../js/settings.js')
require('../js/aoshu-topics.js')
require('../js/aoshu-videos.js')
require('../js/shudu-core.js')
require('../js/shudu-settings.js')
require('../js/shizi-data.js')
require('../js/shizi-core.js')
require('../js/shizi-settings.js')
require('../js/today-core.js')

var T = globalThis.SumSum.today

var problems = []
function check(cond, msg) {
  if (!cond) problems.push(msg)
}

function fakeStorage(init) {
  var m = Object.assign({}, init)
  return {
    getItem: function (k) {
      return Object.prototype.hasOwnProperty.call(m, k) ? m[k] : null
    }
  }
}

/* 2026-10-04 是星期日 */
var NOW = new Date(2026, 9, 4, 20, 30)

/* ---------- 空浏览器 ---------- */

var empty = T.build(fakeStorage({}), NOW)
check(empty.date === '10 月 4 日 星期日', '日期：' + empty.date)

check(empty.aoshu.learned === 0 && empty.aoshu.total === 40, '空浏览器 奥数进度：' + empty.aoshu.learned + '/' + empty.aoshu.total)
check(empty.aoshu.next && empty.aoshu.next.id === 'daxiao', '空浏览器 奥数接着学应是第 01 课：' + JSON.stringify(empty.aoshu.next))
check(empty.aoshu.href === 'aoshu.html?topic=daxiao&review=false', '空浏览器 奥数链接：' + empty.aoshu.href)
check(empty.aoshu.printHref === empty.aoshu.href + '#print', '奥数打印链接要带 #print：' + empty.aoshu.printHref)
check(empty.aoshu.video === null, '第 01 课没有视频，不该标：' + JSON.stringify(empty.aoshu.video))
check(empty.aoshu.parts === '讲解 + 练习 + 解析', '奥数默认三部分都印：' + empty.aoshu.parts)

check(empty.shizi.week === 1 && empty.shizi.weeks === 16, '空浏览器 识字周次：' + empty.shizi.week + '/' + empty.shizi.weeks)
check(empty.shizi.from === 1 && empty.shizi.to === 100, '空浏览器 识字字序：' + empty.shizi.from + '–' + empty.shizi.to)
check(empty.shizi.wrong === 0 && empty.shizi.repeats === 0, '空浏览器 错字数应为 0')
check(empty.shizi.mode === 'week', '空浏览器 识字模式应是本周复习')
check(empty.shizi.printHref === 'shizi.html#print', '识字打印链接不能带设置参数（带了会忽略本地进度）：' + empty.shizi.printHref)

check(empty.kousuan.title === '加减法混合', '空浏览器 口算标题应是默认模式名：' + empty.kousuan.title)
check(empty.kousuan.meta === '20 题 · 3 列 · A4 纵向', '空浏览器 口算摘要：' + empty.kousuan.meta)
check(empty.kousuan.printHref === 'kousuan.html#print', '口算打印链接：' + empty.kousuan.printHref)

check(empty.shudu.title === '四宫格 · 7 个提示', '空浏览器 数独标题：' + empty.shudu.title)
check(empty.shudu.printHref === 'shudu.html#print', '数独打印链接：' + empty.shudu.printHref)

/* ---------- 有进度的浏览器 ---------- */

var learned7 = ['daxiao', 'coushi', 'yiduobushao', 'yiduobushao2', 'tianfu', 'shuzimi', 'shuzimi2']
var used = T.build(fakeStorage({
  'sumsum:aoshu:learned:v1': JSON.stringify(learned7),
  'sumsum:aoshu:v1': JSON.stringify({ topic: 'tuxing', lessonPage: false, answerPage: true }),
  'sumsum:shizi:v1': JSON.stringify({ week: 3, perWeek: 100, withWrong: true }),
  'sumsum:shizi:wrong:v2': JSON.stringify({
    鸟: { add: '2026-09-20', n: 3 },
    闪: { add: '2026-09-21', hit: '2026-09-22', n: 2 },
    瓜: { add: '2026-09-01', out: '2026-09-25', n: 2 }, // 已移出：不算错字，但算反复错
    伞: { add: '2026-09-28' }
  }),
  'sumsum:settings:v1': JSON.stringify({ mode: 'addsub', min: 0, max: 20, carryMode: 'carryonly', count: 40, columns: 2 }),
  'sumsum:shudu:v1': JSON.stringify({ shape: 's6', clues: 18, count: 2, copies: 2 })
}), NOW)

check(used.aoshu.learned === 7, '奥数已学数：' + used.aoshu.learned)
check(used.aoshu.next.id === 'xulie' && used.aoshu.next.no === '08', '学完前 7 课，接着学应是 08 数列找规律：' + JSON.stringify(used.aoshu.next))
check(used.aoshu.video && used.aoshu.video.dur === '3:13', '数列找规律有视频 3:13：' + JSON.stringify(used.aoshu.video))
check(used.aoshu.parts === '练习 + 解析', '关了讲解页，摘要就不该写讲解：' + used.aoshu.parts)

check(used.shizi.week === 3 && used.shizi.from === 201 && used.shizi.to === 300, '识字第 3 周应是 201–300：' + used.shizi.from + '–' + used.shizi.to)
check(used.shizi.wrong === 3, '错字集 3 个（已移出的瓜不算）：' + used.shizi.wrong)
check(used.shizi.repeats === 3, '反复错 3 个（鸟、闪、瓜，移出的也算）：' + used.shizi.repeats)
check(used.shizi.withWrong === true, '识字附错字页的开关要带出来')

check(used.kousuan.title === '20以内进退位', '命中预设时用预设名：' + used.kousuan.title)
check(used.kousuan.meta === '加减法混合 · 40 题 · 2 列 · A4 纵向', '口算摘要：' + used.kousuan.meta)

check(used.shudu.title === '六宫格 · 18 个提示', '数独标题：' + used.shudu.title)
check(used.shudu.meta === '2 题 · 2 份（同题对战） · 自动排版', '数独摘要：' + used.shudu.meta)

/* 跳着学：第 01 课没学、后面学了一堆，接着学仍然回到 01 */
var skip = T.build(fakeStorage({ 'sumsum:aoshu:learned:v1': JSON.stringify(['coushi', 'tianfu']) }), NOW)
check(skip.aoshu.next.id === 'daxiao', '跳着学时接着学指向第一个没学的：' + skip.aoshu.next.id)

/* 全学完：没有「接着学」，改成综合复习 */
var allIds = globalThis.SumSum.aoshu.OUTLINE.map(function (o) { return o.id })
var done = T.build(fakeStorage({ 'sumsum:aoshu:learned:v1': JSON.stringify(allIds) }), NOW)
check(done.aoshu.next === null, '全学完不该还有接着学')
check(done.aoshu.href === 'aoshu.html?review=true', '全学完点进去应是综合复习：' + done.aoshu.href)

/* 已学列表里混进大纲里没有的 id（老版本留下的），不能把进度算多 */
var stale = T.build(fakeStorage({ 'sumsum:aoshu:learned:v1': JSON.stringify(['daxiao', 'no-such-topic']) }), NOW)
check(stale.aoshu.learned === 1, '不在大纲里的 id 不算进度：' + stale.aoshu.learned)

/* ---------- 数据被改坏 ---------- */

var broken
try {
  broken = T.build(fakeStorage({
    'sumsum:aoshu:learned:v1': '{oops',
    'sumsum:aoshu:v1': 'null',
    'sumsum:shizi:v1': JSON.stringify({ week: 999, perWeek: 'abc' }),
    'sumsum:shizi:wrong:v2': JSON.stringify([1, 2, 3]),
    'sumsum:settings:v1': JSON.stringify({ mode: 'nope', count: -5 }),
    'sumsum:shudu:v1': '"just a string"'
  }), NOW)
} catch (e) {
  problems.push('数据改坏时抛了异常：' + e.message)
}
if (broken) {
  check(broken.aoshu.learned === 0, '已学数据坏了应当作 0')
  check(broken.shizi.week === 16, '周次超出范围应钳到最后一周：' + broken.shizi.week)
  check(broken.shizi.wrong === 0, '错字集格式不对应当作空')
  check(broken.kousuan.title === '加减法混合', '口算模式乱填应退回默认：' + broken.kousuan.title)
  check(broken.shudu.title === '四宫格 · 7 个提示', '数独设置坏了应退回默认：' + broken.shudu.title)
}

/* 存储本身不可用（隐私模式下 getItem 直接抛） */
try {
  var hostile = T.build({ getItem: function () { throw new Error('denied') } }, NOW)
  check(hostile.aoshu.learned === 0 && hostile.shizi.week === 1, '存储不可用时应全用默认值')
} catch (e) {
  problems.push('存储不可用时抛了异常：' + e.message)
}

/* ---------- 视频登记表 ---------- */

var V = globalThis.SumSum.aoshuVideos
check(V.of('xulie').src === 'https://video.qingchejun.com/aoshu/xulie.mp4', '视频地址：' + JSON.stringify(V.of('xulie')))
check(V.of('shuzimi').dur === '3:09', '数字谜基础篇视频时长：' + JSON.stringify(V.of('shuzimi')))
check(V.of('yiduobushao').src === 'https://video.qingchejun.com/aoshu/yiduobushao.mp4' && V.of('yiduobushao').dur === '3:42',
  '移多补少基础篇视频：' + JSON.stringify(V.of('yiduobushao')))
check(V.of('daxiao') === null, '没视频的课应返回 null')
check(V.of('__proto__') === null && V.of('toString') === null, '原型链上的名字不能当成有视频')
Object.keys(V.list).forEach(function (id) {
  var inOutline = globalThis.SumSum.aoshu.OUTLINE.some(function (o) { return o.id === id })
  check(inOutline, '视频登记了大纲里没有的知识点：' + id)
})

if (problems.length) {
  console.log('✗ ' + problems.length + ' 处问题：')
  problems.forEach(function (p) { console.log('  - ' + p) })
  process.exit(1)
}
console.log('✓ 今天首页：空浏览器 / 有进度 / 跳着学 / 全学完 / 数据损坏 / 存储不可用 / 视频登记表 全部通过')
