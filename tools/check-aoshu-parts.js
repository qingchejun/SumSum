/**
 * 奥数「打印哪几部分」校验脚本。用法：node tools/check-aoshu-parts.js
 *
 * 讲解页 / 练习题 / 解析页三样随意勾，但不能一样都不印 —— 那样点「打印」出来一张白纸。
 * 规则：三样全关时把练习题打开；综合复习卷没有讲解页，所以那时只看练习和解析。
 * 网址参数、localStorage 都可能带着「全关」进来（手改链接、老数据），sanitize 是唯一的收口。
 * 顺带压住综合复习卷「混哪几课」（reviewTopics）的清洗规则。
 */
'use strict'

require('../js/aoshu-topics.js')
require('../js/aoshu-topic-shuzimi.js')
require('../js/aoshu-topic-xulie.js')
require('../js/aoshu-settings.js')

var A = globalThis.SumSum.aoshu.settings

var problems = []
function check(cond, msg) {
  if (!cond) problems.push(msg)
}

var d = A.sanitize({})
check(d.practicePage === true, '默认要印练习题')
check(d.lessonPage === true && d.answerPage === true, '默认讲解、解析都印')

var onlyLesson = A.sanitize({ practicePage: false, answerPage: false, lessonPage: true })
check(onlyLesson.practicePage === false && onlyLesson.lessonPage === true, '只印讲解页是合法的（看完视频单独印讲解）')

var onlyAnswer = A.sanitize({ practicePage: false, answerPage: true, lessonPage: false })
check(onlyAnswer.practicePage === false, '只印解析页是合法的')

var none = A.sanitize({ practicePage: false, answerPage: false, lessonPage: false })
check(none.practicePage === true, '三样全关时应把练习题打开')

var fromUrl = A.sanitize({ practicePage: 'false', answerPage: '0', lessonPage: 'false' })
check(fromUrl.practicePage === true, '网址里的字符串 false 也要收口')

/* 综合复习卷没有讲解页：只开着讲解等于什么都不印 */
var review = A.sanitize({ review: true, practicePage: false, answerPage: false, lessonPage: true })
check(review.practicePage === true, '综合复习只开讲解时应把练习题打开')

var reviewAns = A.sanitize({ review: true, practicePage: false, answerPage: true })
check(reviewAns.practicePage === false, '综合复习只印解析是合法的')

/* 复习卷范围：和「已学」分开存，乱序、重复、不存在的 id 都要收口成大纲顺序的干净写法 */
check(d.reviewTopics === '', '默认复习范围为空：' + JSON.stringify(d.reviewTopics))
var scope = A.sanitize({ reviewTopics: 'xulie, shuzimi,xulie,no-such,__proto__,yiduobushao' })
check(scope.reviewTopics === 'yiduobushao,shuzimi,xulie', '复习范围应按大纲排、去重、去掉不存在的：' + scope.reviewTopics)
check(A.sanitize({ reviewTopics: 42 }).reviewTopics === '', '复习范围乱填应当作空')
check(A.sanitize({ reviewTopics: null }).reviewTopics === '', '复习范围为 null 应当作空')

if (problems.length) {
  console.log('✗ ' + problems.length + ' 处问题：')
  problems.forEach(function (p) { console.log('  - ' + p) })
  process.exit(1)
}
console.log('✓ 奥数打印哪几部分：默认 / 单印一样 / 全关收口 / 网址字符串 / 综合复习 / 复习范围 全部通过')
