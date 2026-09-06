/**
 * 知识点「30 奇数与偶数」：奇偶的本质是「两两配对」。
 * 变式：①认奇偶（看个位）②和的奇偶（不用算）③翻杯子（奇偶的应用）。
 */
(function (root) {
  'use strict'

  var U = root.SumSum.aoshu.util

  function isOdd(n) {
    return n % 2 === 1
  }

  function parityWord(n) {
    return isOdd(n) ? '奇数' : '偶数'
  }

  /* 变式①认奇偶：看个位判断，验算用「两两配对」拆成 h+h(+1) */
  function genJudge(s) {
    var n = U.randInt(1, U.diff(s).numMax)
    var d = n % 10
    var h = Math.floor(n / 2)
    var ans = parityWord(n)
    var check = isOdd(n)
      ? n + ' = ' + h + ' + ' + h + ' + 1，两份一样多、还多出 1 个——配完对多 1 个，是奇数 ✓'
      : n + ' = ' + h + ' + ' + h + '，两份一样多，正好配完对——是偶数 ✓'
    return {
      topic: 'jiou',
      variant: 'judge',
      stem: n + ' 是奇数还是偶数？',
      answer: ans,
      unit: '',
      ansLabel: '答：' + n + ' 是',
      ansSuffix: '。',
      workLabel: '理由',
      solution: [
        { tag: '想一想', text: '看个位就行：个位是 0、2、4、6、8 的是偶数；个位是 1、3、5、7、9 的是奇数。' },
        { tag: '判一判', text: n + ' 的个位是 ' + d + '，所以它是' + ans + '。' },
        { tag: '验一验', text: check },
        { tag: '答', text: n + ' 是' + ans + '。' }
      ],
      key: 'judge:' + n
    }
  }

  /* 变式②和的奇偶：不用算出得数，用配对道理判断 */
  function genSum(s) {
    var half = Math.floor(U.diff(s).numMax / 2)
    var a = U.randInt(2, half)
    var b = U.randInt(2, half)
    var sum = a + b
    var ans = parityWord(sum)
    var reason
    if (isOdd(a) && isOdd(b)) {
      reason = a + ' 是奇数、' + b + ' 也是奇数：两边各多出 1 个，凑到一起正好又配成一对——和是偶数。'
    } else if (!isOdd(a) && !isOdd(b)) {
      reason = a + ' 和 ' + b + ' 都是偶数，各自都能配完对，合起来还是配得完——和是偶数。'
    } else {
      var oddOne = isOdd(a) ? a : b
      var evenOne = isOdd(a) ? b : a
      reason = oddOne + ' 是奇数、' + evenOne + ' 是偶数：只有一边多出 1 个，合起来还是多 1 个——和是奇数。'
    }
    return {
      topic: 'jiou',
      variant: 'sum',
      stem: '不用算出得数，你能知道 ' + a + ' + ' + b + ' 的和是奇数还是偶数吗？',
      answer: ans,
      unit: '',
      ansLabel: '答：和是',
      ansSuffix: '。',
      workLabel: '理由',
      solution: [
        { tag: '想一想', text: '偶数能两两配成对；奇数配完对总会多出 1 个。把两个数放到一起，看多出来的「1 个」还在不在。' },
        { tag: '判一判', text: reason },
        { tag: '验一验', text: '真算一遍：' + a + ' + ' + b + ' = ' + sum + '，个位是 ' + (sum % 10) + '，果然是' + ans + ' ✓' },
        { tag: '答', text: a + ' + ' + b + ' 的和是' + ans + '（不用算也知道）。' }
      ],
      key: 'sum:' + a + ',' + b
    }
  }

  /* 变式③翻杯子：翻 2 次回原样，看翻动次数的奇偶 */
  function genFlip(s) {
    var maxN = s.difficulty === 'L1' ? 15 : s.difficulty === 'L2' ? 25 : 50
    var n = U.randInt(3, maxN)
    var name = U.pick(U.NAMES)
    var odd = isOdd(n)
    var ans = odd ? '朝下' : '朝上'
    var h = Math.floor(n / 2)
    var check = odd
      ? n + ' = ' + h + ' 个「翻两次」+ 1 次：' + h + ' 个「翻两次」都回到朝上，最后多的 1 次翻成朝下 ✓'
      : n + ' = ' + h + ' 个「翻两次」：每个「翻两次」都回到原样，所以还是朝上 ✓'
    return {
      topic: 'jiou',
      variant: 'flip',
      stem: '桌上一只杯子杯口朝上。' + name + '把它翻动了 ' + n + ' 次，现在杯口朝上还是朝下？',
      answer: ans,
      unit: '',
      ansLabel: '答：杯口',
      ansSuffix: '。',
      workLabel: '理由',
      solution: [
        { tag: '想一想', text: '翻 1 次朝下，再翻 1 次又回到朝上——「翻两次」等于没翻。' },
        { tag: '找规律', text: '翻 1 次朝下、2 次朝上、3 次朝下、4 次朝上……单数次朝下，双数次朝上。' },
        { tag: '判一判', text: n + ' 的个位是 ' + (n % 10) + '，是' + parityWord(n) + '，所以杯口' + ans + '。' },
        { tag: '验一验', text: check },
        { tag: '答', text: '翻了 ' + n + ' 次后，杯口' + ans + '。' }
      ],
      key: 'flip:' + n
    }
  }

  var JIOU = {
    id: 'jiou',
    no: '30',
    stage: 'L2',
    name: '奇数与偶数',
    lesson: {
      title: '奇数与偶数 · 方法讲解',
      sections: [
        {
          heading: '这是什么问题？',
          paras: ['数分两队：能两两配成对的是偶数（2、4、6、8……），配完对总多出 1 个的是奇数（1、3、5、7……）。很多问题不用算出得数，看奇偶就有答案。']
        },
        {
          heading: '怎么想？',
          paras: [
            '第一招：看个位。个位是 0、2、4、6、8 → 偶数；个位是 1、3、5、7、9 → 奇数。',
            '第二招：想配对。奇数 + 奇数 = 偶数（两个单个凑成一对）；偶数 + 偶数 = 偶数；奇数 + 偶数 = 奇数（那个单个还孤零零的）。'
          ]
        },
        {
          heading: '例题示范',
          example: {
            stem: '不用算出得数，你能知道 7 + 8 的和是奇数还是偶数吗？',
            solution: [
              { tag: '想一想', text: '偶数能两两配对；奇数配完对多出 1 个。' },
              { tag: '判一判', text: '7 是奇数、8 是偶数：只有一边多出 1 个，合起来还是多 1 个——和是奇数。' },
              { tag: '验一验', text: '真算一遍：7 + 8 = 15，个位是 5，果然是奇数 ✓' },
              { tag: '答', text: '7 + 8 的和是奇数。' }
            ]
          }
        },
        { heading: '记住口诀', chant: '个位看奇偶，配对想道理；单加单成双，单双还是单。' }
      ]
    },
    variants: [
      { id: 'judge', setting: 'vJoJudge', label: '认奇偶（看个位）', gen: genJudge },
      { id: 'sum', setting: 'vJoSum', label: '和的奇偶（不用算）', gen: genSum },
      { id: 'flip', setting: 'vJoFlip', label: '翻杯子（奇偶应用）', def: false, gen: genFlip }
    ],
    generate: function (s) {
      return U.generateFrom(JIOU.variants, s)
    },
    titleFor: function (s) {
      return '奇数与偶数练习 · ' + U.diff(s).numMax + '以内'
    }
  }

  root.SumSum.aoshu.topics.jiou = JIOU
  root.SumSum.aoshu.topicList.push(JIOU)
})(typeof window !== 'undefined' ? window : globalThis)
