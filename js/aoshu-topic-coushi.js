/**
 * 知识点「02 凑十、平十和破十」：20 以内进退位计算的三把小钥匙。
 * 变式：①10 的好朋友（填空基本功）②凑十法（进位加）③破十法（退位减）④平十法（连减凑整）。
 * L1 限 20 以内；L2/L3 扩到几十几（如 29 + 6、25 − 9），拆分逻辑相同。
 */
(function (root) {
  'use strict'

  var U = root.SumSum.aoshu.util

  /* 变式①10 的好朋友：合起来是 10 的两个数，凑十法的基本功（不随难度变化） */
  var PAIR_TEXT = '1 和 9、2 和 8、3 和 7、4 和 6、5 和 5'
  function genFriend(s) {
    var a = U.randInt(1, 9)
    var ans = 10 - a
    var form = U.pick(['sum', 'left', 'right'])
    var eq
    if (form === 'sum') eq = '10 = ' + a + ' + □'
    else if (form === 'left') eq = '□ + ' + a + ' = 10'
    else eq = a + ' + □ = 10'
    return {
      topic: 'coushi',
      variant: 'friend',
      stem: '10 的好朋友，□ 里填几？　' + eq,
      answer: ans,
      unit: '',
      ansLabel: '答：□ 里填',
      ansSuffix: '。',
      workLabel: '算一算',
      solution: [
        { tag: '想一想', text: '合起来是 10 的两个数是「10 的好朋友」：' + PAIR_TEXT + '。' },
        { tag: '第 1 步', text: a + ' 的好朋友是 ' + ans + '：' + a + ' + ' + ans + ' = 10，所以 □ 里填 ' + ans + '。' },
        { tag: '验一验', text: '10 − ' + a + ' = ' + ans + '，正好 ✓' },
        { tag: '答', text: '□ 里填 ' + ans + '。' }
      ],
      key: 'friend:' + form + ',' + a
    }
  }

  /* 变式②凑十法：big + b（个位相加进位），把 b 拆成「凑整的」和「剩下的」 */
  function genCou(s) {
    var cap = U.diff(s).numMax
    var a = U.randInt(6, 9) // big 的个位
    var b = U.randInt(11 - a, 9) // 保证个位相加超过 10
    var maxT = Math.floor((cap - 9 - a) / 10)
    var t = s.difficulty === 'L1' ? 0 : U.randInt(0, Math.max(0, maxT))
    var big = t * 10 + a
    var split1 = 10 - a // 凑整需要的
    var split2 = b - split1 // 剩下的（≥1）
    var round = big + split1
    var ans = big + b
    return {
      topic: 'coushi',
      variant: 'cou',
      stem: '用凑十法算一算：' + big + ' + ' + b,
      answer: ans,
      unit: '',
      ansLabel: '答：' + big + ' + ' + b + ' =',
      ansSuffix: '。',
      workLabel: '分一分',
      solution: [
        { tag: '想一想', text: big + ' 差 ' + split1 + ' 就凑成 ' + round + '，先把它凑整。' },
        { tag: '第 1 步', text: '把 ' + b + ' 分成 ' + split1 + ' 和 ' + split2 + '。' },
        { tag: '第 2 步', text: big + ' + ' + split1 + ' = ' + round + '。' },
        { tag: '第 3 步', text: round + ' + ' + split2 + ' = ' + ans + '。' },
        { tag: '验一验', text: ans + ' − ' + b + ' = ' + big + '，倒回去正好 ✓' },
        { tag: '答', text: big + ' + ' + b + ' = ' + ans + '。' }
      ],
      key: 'cou:' + big + ',' + b
    }
  }

  /* 变式③破十法：M − d（个位不够减），把 M 拆出一个 10 来减 */
  function genPo(s) {
    var cap = U.diff(s).numMax
    var m = U.randInt(1, 8) // M 的个位
    var d = U.randInt(m + 1, 9) // 个位不够减，必须退位
    var maxT = Math.floor((cap - m) / 10)
    var t = s.difficulty === 'L1' ? 1 : U.randInt(1, Math.max(1, maxT))
    var M = t * 10 + m
    var left = M - 10
    var r1 = 10 - d
    var ans = M - d
    return {
      topic: 'coushi',
      variant: 'po',
      stem: '用破十法算一算：' + M + ' − ' + d,
      answer: ans,
      unit: '',
      ansLabel: '答：' + M + ' − ' + d + ' =',
      ansSuffix: '。',
      workLabel: '分一分',
      solution: [
        { tag: '想一想', text: '个位 ' + m + ' 不够减 ' + d + '，从 ' + M + ' 里拿出一个 10 来减——这就是破十法。' },
        { tag: '第 1 步', text: '把 ' + M + ' 分成 10 和 ' + left + '。' },
        { tag: '第 2 步', text: '10 − ' + d + ' = ' + r1 + '。' },
        { tag: '第 3 步', text: r1 + ' + ' + left + ' = ' + ans + '。' },
        { tag: '验一验', text: ans + ' + ' + d + ' = ' + M + '，加回去正好 ✓' },
        { tag: '答', text: M + ' − ' + d + ' = ' + ans + '。' }
      ],
      key: 'po:' + M + ',' + d
    }
  }

  /* 变式④平十法：M − d 连减凑整，先减掉 M 的个位到整十，再减剩下的 */
  function genPing(s) {
    var cap = U.diff(s).numMax
    var m = U.randInt(1, 8)
    var d = U.randInt(m + 1, 9)
    var maxT = Math.floor((cap - m) / 10)
    var t = s.difficulty === 'L1' ? 1 : U.randInt(1, Math.max(1, maxT))
    var M = t * 10 + m
    var round = t * 10
    var rest = d - m
    var ans = round - rest
    return {
      topic: 'coushi',
      variant: 'ping',
      stem: '用平十法算一算：' + M + ' − ' + d,
      answer: ans,
      unit: '',
      ansLabel: '答：' + M + ' − ' + d + ' =',
      ansSuffix: '。',
      workLabel: '分一分',
      solution: [
        { tag: '想一想', text: '先把 ' + M + ' 减到整十，再减剩下的——这就是平十法（连减）。' },
        { tag: '第 1 步', text: '把 ' + d + ' 分成 ' + m + ' 和 ' + rest + '（先减的 ' + m + ' 正好是 ' + M + ' 的个位）。' },
        { tag: '第 2 步', text: M + ' − ' + m + ' = ' + round + '。' },
        { tag: '第 3 步', text: round + ' − ' + rest + ' = ' + ans + '。' },
        { tag: '验一验', text: ans + ' + ' + d + ' = ' + M + '，加回去正好 ✓' },
        { tag: '答', text: M + ' − ' + d + ' = ' + ans + '。' }
      ],
      key: 'ping:' + M + ',' + d
    }
  }

  var COUSHI = {
    id: 'coushi',
    no: '02',
    stage: 'L1',
    name: '凑十、平十和破十',
    lesson: {
      title: '凑十、平十和破十 · 方法讲解',
      sections: [
        {
          heading: '这是什么问题？',
          paras: ['20 以内的进位加法和退位减法，掰手指又慢又容易错。凑十、破十、平十是三把小钥匙：把数拆一拆，先凑成 10 或先退到 10，一下就算出来。']
        },
        {
          heading: '怎么想？',
          paras: [
            '10 的好朋友：合起来是 10 的两个数（' + PAIR_TEXT + '）。把好朋友记熟，凑十、破十都会变快。',
            '凑十法（进位加）：9 + 6 → 9 差 1 到 10，把 6 分成 1 和 5：9 + 1 = 10，10 + 5 = 15。',
            '破十法（退位减）：15 − 9 → 把 15 分成 10 和 5：先 10 − 9 = 1，再 1 + 5 = 6。',
            '平十法（退位减）：15 − 6 → 把 6 分成 5 和 1：先 15 − 5 = 10，再 10 − 1 = 9。'
          ]
        },
        {
          heading: '例题示范',
          example: {
            stem: '用凑十法算一算：9 + 6',
            solution: [
              { tag: '想一想', text: '9 差 1 就凑成 10，先把它凑整。' },
              { tag: '第 1 步', text: '把 6 分成 1 和 5。' },
              { tag: '第 2 步', text: '9 + 1 = 10。' },
              { tag: '第 3 步', text: '10 + 5 = 15。' },
              { tag: '验一验', text: '15 − 6 = 9，倒回去正好 ✓' },
              { tag: '答', text: '9 + 6 = 15。' }
            ]
          }
        },
        { heading: '记住口诀', chant: '拆小数、凑整十，先到十、再算剩。' }
      ]
    },
    variants: [
      { id: 'friend', setting: 'vCsFriend', label: '10 的好朋友（凑十基本功）', gen: genFriend },
      { id: 'cou', setting: 'vCsCou', label: '凑十法（进位加）', gen: genCou },
      { id: 'po', setting: 'vCsPo', label: '破十法（退位减）', gen: genPo },
      { id: 'ping', setting: 'vCsPing', label: '平十法（连减凑整）', gen: genPing }
    ],
    generate: function (s) {
      return U.generateFrom(COUSHI.variants, s)
    },
    titleFor: function (s) {
      return '凑十平十破十练习 · ' + U.diff(s).numMax + '以内'
    }
  }

  root.SumSum.aoshu.topics.coushi = COUSHI
  root.SumSum.aoshu.topicList.push(COUSHI)
})(typeof window !== 'undefined' ? window : globalThis)
