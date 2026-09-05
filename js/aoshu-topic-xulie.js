/**
 * 知识点「08 数列找规律」：给一串数，找出规律填空。
 * 变式：①等差（每次加/减固定数）②交替（隔项各有规律）③步长递增（加的数每次多 1，稍难默认关）。
 * 所有变式都反向构造：先定规律再生成数列，天然合法。
 */
(function (root) {
  'use strict'

  var U = root.SumSum.aoshu.util

  /* 各难度档的公差/步长上限（数列各项仍受 diff(s).numMax 约束） */
  var STEP_MAX = { L1: 5, L2: 9, L3: 12 }

  function stepMax(s) {
    return STEP_MAX[s.difficulty] || STEP_MAX.L1
  }

  /* 把数列渲染成题干，空格处用（　） */
  function stemOf(terms, blank) {
    var parts = terms.map(function (t, i) {
      return i === blank ? '（　）' : String(t)
    })
    return '找规律，填一填：' + parts.join('、')
  }

  /* 变式①等差：6 项，每次加/减固定数 step */
  function genDengcha(s) {
    var cap = U.diff(s).numMax
    var step = U.randInt(1, stepMax(s))
    var up = Math.random() < 0.7 // 递增为主，递减少量出现
    if (cap - step * 5 < 1) return null
    var a0 = up ? U.randInt(1, cap - step * 5) : U.randInt(step * 5 + 1, cap)
    var d = up ? step : -step
    var terms = []
    for (var i = 0; i < 6; i++) terms.push(a0 + d * i)
    var blank = U.randInt(2, 5)
    var word = up ? '加' : '减'
    var prev = terms[blank - 1]

    /* 「找规律」只能用看得见的数：挑两对不含挖空位置的相邻数来比 */
    function cmp(i) {
      return up
        ? terms[i + 1] + ' − ' + terms[i] + ' = ' + step
        : terms[i] + ' − ' + terms[i + 1] + ' = ' + step
    }
    var pair2 = blank === 2 ? 3 : 1 // 空在第 3 个时，第二对改用它后面的相邻数

    var check =
      blank < 5
        ? terms[blank] + (up ? ' + ' : ' − ') + step + ' = ' + terms[blank + 1] + '，和后面的数正好接上 ✓'
        : terms[blank] + (up ? ' − ' : ' + ') + step + ' = ' + terms[blank - 1] + '，和前面的数正好接上 ✓'
    return {
      topic: 'xulie',
      variant: 'dengcha',
      stem: stemOf(terms, blank),
      answer: terms[blank],
      unit: '',
      ansLabel: '答：括号里填',
      ansSuffix: '。',
      workLabel: '规律',
      solution: [
        { tag: '想一想', text: '把相邻的两个数比一比，看每次变化多少。' },
        {
          tag: '找规律',
          text: '比一比：' + cmp(0) + '，' + cmp(pair2) + '——每个数都比前一个' + word + ' ' + step + '。'
        },
        { tag: '算一算', text: '括号前面的数是 ' + prev + '：' + prev + (up ? ' + ' : ' − ') + step + ' = ' + terms[blank] + '。' },
        { tag: '验一验', text: check },
        { tag: '答', text: '括号里填 ' + terms[blank] + '。' }
      ],
      key: 'dengcha:' + terms.join(',') + ':' + blank
    }
  }

  /* 变式②交替：8 项，第 1、3、5、7 个一组、第 2、4、6、8 个一组，各自有规律 */
  function genJiaoti(s) {
    var cap = U.diff(s).numMax
    var stepA = U.randInt(1, stepMax(s))
    var stepB = U.randInt(0, stepMax(s)) // 0 = 另一组是不变的数
    if (cap - stepA * 3 < 1) return null
    var a0 = U.randInt(1, cap - stepA * 3)
    var b0 = stepB === 0 ? U.randInt(1, cap) : U.randInt(1, cap - stepB * 3)
    /* 巧合排除：两组步长相同且 b0 正好落在 A 组中点时，整列退化成普通等差数列，
       按「隔项」讲解就是误导——丢弃重出 */
    if (stepA === stepB && 2 * (b0 - a0) === stepA) return null
    var terms = []
    for (var i = 0; i < 4; i++) {
      terms.push(a0 + stepA * i)
      terms.push(b0 + stepB * i)
    }
    var blank = U.randInt(4, 7)
    var inA = blank % 2 === 0
    /* 组内清单里被挖的数要写成（　），不能拿答案证答案 */
    function listGroup(idxs) {
      return idxs
        .map(function (i) {
          return i === blank ? '（　）' : String(terms[i])
        })
        .join('、')
    }
    var ruleA = '第 1、3、5、7 个是：' + listGroup([0, 2, 4, 6]) + '，每次加 ' + stepA
    var ruleB =
      '第 2、4、6、8 个是：' + listGroup([1, 3, 5, 7]) +
      (stepB === 0 ? '，都是 ' + b0 : '，每次加 ' + stepB)
    var prevInGroup = terms[blank - 2]
    var stepHere = inA ? stepA : stepB
    var readback = terms.map(function (t) {
      return String(t)
    })
    return {
      topic: 'xulie',
      variant: 'jiaoti',
      stem: stemOf(terms, blank),
      answer: terms[blank],
      unit: '',
      ansLabel: '答：括号里填',
      ansSuffix: '。',
      workLabel: '规律',
      solution: [
        { tag: '想一想', text: '一个挨一个比看不出规律？隔一个看看：第 1、3、5、7 个是一组，第 2、4、6、8 个是一组。' },
        { tag: '找规律', text: ruleA + '；' + ruleB + '。' },
        {
          tag: '算一算',
          text:
            '括号是第 ' + (blank + 1) + ' 个，属于' + (inA ? '第 1、3、5、7 个' : '第 2、4、6、8 个') + '这一组' +
            (stepHere === 0
              ? '——这一组都是 ' + terms[blank] + '。'
              : '，接在 ' + prevInGroup + ' 后面：' + prevInGroup + ' + ' + stepHere + ' = ' + terms[blank] + '。')
        },
        { tag: '验一验', text: '填进去再读一遍：' + readback.join('、') + '，两组规律都对 ✓' },
        { tag: '答', text: '括号里填 ' + terms[blank] + '。' }
      ],
      key: 'jiaoti:' + terms.join(',') + ':' + blank
    }
  }

  /* 变式③步长递增：加的数每次多 1（如 +1、+2、+3…），稍难 */
  function genDizeng(s) {
    var cap = U.diff(s).numMax
    var s0 = U.randInt(1, 2)
    var total = s0 * 5 + 10 // 5 步共增加 s0+(s0+1)+…+(s0+4)
    if (cap - total < 1) return null
    var a0 = U.randInt(1, cap - total)
    var terms = [a0]
    var steps = []
    for (var i = 0; i < 5; i++) {
      steps.push(s0 + i)
      terms.push(terms[i] + s0 + i)
    }
    var blank = U.randInt(3, 5)
    var stepHere = steps[blank - 1]

    /* 「找规律」只列挖空位置之前的差——不能拿被挖的数推规律 */
    var known = []
    var knownSteps = []
    for (var j = 0; j < Math.min(blank - 1, 3); j++) {
      known.push(terms[j + 1] + ' − ' + terms[j] + ' = ' + steps[j])
      knownSteps.push('+' + steps[j])
    }
    var check =
      blank < 5
        ? terms[blank] + ' + ' + steps[blank] + ' = ' + terms[blank + 1] + '，和后面的数正好接上 ✓'
        : '把每次加的数连起来看：+' + steps.join('、+') + '，正好每次多 1 ✓'
    return {
      topic: 'xulie',
      variant: 'dizeng',
      stem: stemOf(terms, blank),
      answer: terms[blank],
      unit: '',
      ansLabel: '答：括号里填',
      ansSuffix: '。',
      workLabel: '规律',
      solution: [
        { tag: '想一想', text: '每次加的数好像不一样？把每次加了多少一个个写出来看看。' },
        {
          tag: '找规律',
          text: known.join('，') + '——加的数是 ' + knownSteps.join('、') + '……每次多 1。'
        },
        { tag: '算一算', text: '括号前面的数是 ' + terms[blank - 1] + '，这一步该加 ' + stepHere + '：' + terms[blank - 1] + ' + ' + stepHere + ' = ' + terms[blank] + '。' },
        { tag: '验一验', text: check },
        { tag: '答', text: '括号里填 ' + terms[blank] + '。' }
      ],
      key: 'dizeng:' + terms.join(',') + ':' + blank
    }
  }

  var XULIE = {
    id: 'xulie',
    no: '08',
    stage: 'L1',
    name: '数列找规律',
    lesson: {
      title: '数列找规律 · 方法讲解',
      sections: [
        {
          heading: '这是什么问题？',
          paras: ['一串数按顺序排好队，前后藏着一个不变的规律。找到规律，就知道空格里该填什么。']
        },
        {
          heading: '怎么想？',
          paras: [
            '第一招：把相邻的两个数比一比，看每次多几、少几。',
            '第二招：要是挨着比看不出来，就隔一个看——第 1、3、5 个一组，第 2、4、6 个一组，常常各有各的规律。'
          ]
        },
        {
          heading: '例题示范',
          example: {
            stem: '找规律，填一填：2、5、8、11、（　）、17',
            solution: [
              { tag: '想一想', text: '把相邻的两个数比一比，看每次变化多少。' },
              { tag: '找规律', text: '5 − 2 = 3，8 − 5 = 3，11 − 8 = 3——每个数都比前一个加 3。' },
              { tag: '算一算', text: '括号前面的数是 11：11 + 3 = 14。' },
              { tag: '验一验', text: '14 + 3 = 17，和后面的数正好接上 ✓' },
              { tag: '答', text: '括号里填 14。' }
            ]
          }
        },
        { heading: '记住口诀', chant: '相邻比一比，隔项看一看；找准变化数，填完再验算。' }
      ]
    },
    variants: [
      { id: 'dengcha', setting: 'vXlDengcha', label: '等差数列（每次加/减固定数）', gen: genDengcha },
      { id: 'jiaoti', setting: 'vXlJiaoti', label: '交替数列（隔项找规律）', gen: genJiaoti },
      { id: 'dizeng', setting: 'vXlDizeng', label: '步长递增（加的数每次多 1）', def: false, gen: genDizeng }
    ],
    generate: function (s) {
      return U.generateFrom(XULIE.variants, s)
    },
    titleFor: function (s) {
      return '数列找规律练习 · ' + U.diff(s).numMax + '以内'
    }
  }

  root.SumSum.aoshu.topics.xulie = XULIE
  root.SumSum.aoshu.topicList.push(XULIE)
})(typeof window !== 'undefined' ? window : globalThis)
