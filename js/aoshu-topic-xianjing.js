/**
 * 知识点「18 趣味陷阱题」：题面看着是算术，其实考审题——藏着一个小陷阱。
 * 解析里专门有一步「小心陷阱」把坑讲透。
 * 变式：①年龄差不变 ②蜡烛陷阱 ③分东西别忘了自己。
 */
(function (root) {
  'use strict'

  var U = root.SumSum.aoshu.util

  /* 变式①：年龄差不变——「x 年后」是来捣乱的，答案与 x 无关 */
  function genAge(s) {
    var who = U.pickTwoNames()
    var A = who[0]
    var B = who[1]
    var d = U.randInt(1, 6)
    var b = U.randInt(3, 12)
    var a = b + d
    var x = U.randInt(1, 10)
    return {
      topic: 'xianjing',
      variant: 'age',
      stem:
        '今年' + A + ' ' + a + ' 岁，' + B + ' ' + b + ' 岁。' +
        x + ' 年以后，' + A + '比' + B + '大几岁？',
      answer: d,
      unit: '岁',
      ansLabel: '答：' + A + '还是比' + B + '大',
      ansSuffix: '岁。',
      solution: [
        { tag: '小心陷阱', text: '「' + x + ' 年以后」是来捣乱的！两人一起长大，每过一年都各长 1 岁，相差的岁数永远不变。' },
        { tag: '列算式', text: a + ' − ' + b + ' = ' + d + '（岁）。' },
        { tag: '验一验', text: x + ' 年后' + A + ' ' + (a + x) + ' 岁、' + B + ' ' + (b + x) + ' 岁：' + (a + x) + ' − ' + (b + x) + ' = ' + d + '，还是大 ' + d + ' 岁 ✓' },
        { tag: '答', text: x + ' 年以后，' + A + '还是比' + B + '大 ' + d + ' 岁。' }
      ],
      key: 'age:' + a + ',' + b + ',' + x
    }
  }

  /* 变式②：蜡烛陷阱——点着的会烧完，吹灭的反而留下来 */
  function genCandle(s) {
    var cap = U.diff(s).numMax
    var n = U.randInt(5, Math.min(15, cap))
    var m = U.randInt(1, n - 1)
    return {
      topic: 'xianjing',
      variant: 'candle',
      stem:
        '晚上，桌上点着 ' + n + ' 支蜡烛，一阵风吹灭了 ' + m +
        ' 支。到第二天早上，桌上还剩几支蜡烛？',
      answer: m,
      unit: '支',
      ansLabel: '答：桌上还剩',
      ansSuffix: '支蜡烛。',
      solution: [
        { tag: '小心陷阱', text: '别急着算 ' + n + ' − ' + m + '！点着的蜡烛会一直烧，烧到最后就没有了；被吹灭的那几支不烧了，反而留了下来。' },
        { tag: '想一想', text: '还亮着的 ' + (n - m) + ' 支，到早上全烧光了；吹灭的 ' + m + ' 支好好地留在桌上。' },
        { tag: '验一验', text: '要是回答「' + (n - m) + ' 支」，算的是夜里还亮着几支，可题目问的是早上剩几支——别上当。' },
        { tag: '答', text: '桌上还剩 ' + m + ' 支蜡烛（就是被吹灭的那些）。' }
      ],
      key: 'candle:' + n + ',' + m
    }
  }

  /* 变式③：一起分东西——「一起分」的人里别忘了自己 */
  function genShare(s) {
    var cap = U.diff(s).numMax
    var name = U.pick(U.NAMES)
    var per = U.randInt(2, Math.floor(Math.min(cap, 48) / 3))
    var t = per * 3
    if (t > cap) return null
    return {
      topic: 'xianjing',
      variant: 'share',
      stem:
        name + '和爸爸、妈妈一起分 ' + t + ' 个橘子，每人分得同样多。每人分到几个？',
      answer: per,
      unit: '个',
      ansLabel: '答：每人分到',
      ansSuffix: '个橘子。',
      solution: [
        { tag: '小心陷阱', text: '「一起分」的一共有几个人？' + name + '、爸爸、妈妈——是 3 个人，别忘了把' + name + '自己数进去！' },
        { tag: '试一试', text: '3 个几加起来是 ' + t + '？3 个 ' + (per - 1) + ' 是 ' + 3 * (per - 1) + '，不够；3 个 ' + per + ' 正好是 ' + t + '。' },
        { tag: '验一验', text: per + ' + ' + per + ' + ' + per + ' = ' + t + '（个），三人正好分完 ✓' },
        { tag: '答', text: '每人分到 ' + per + ' 个橘子。' }
      ],
      key: 'share:' + t
    }
  }

  var XIANJING = {
    id: 'xianjing',
    no: '18',
    stage: 'L1',
    name: '趣味陷阱题',
    lesson: {
      title: '趣味陷阱题 · 方法讲解',
      sections: [
        {
          heading: '这是什么问题？',
          paras: ['这些题看起来是算术，其实在考「审题」：题目里藏着一个小陷阱，照着习惯闷头一算就会上当。']
        },
        {
          heading: '怎么想？',
          paras: [
            '动笔前先停一秒，问自己两个问题：题目问的到底是什么？题里有没有哪个数是来捣乱的？',
            '把题目再读一遍，比急着列算式更重要。读懂了，这些题一点都不难。'
          ]
        },
        {
          heading: '例题示范',
          example: {
            stem: '晚上，桌上点着 8 支蜡烛，一阵风吹灭了 3 支。到第二天早上，桌上还剩几支蜡烛？',
            solution: [
              { tag: '小心陷阱', text: '别急着算 8 − 3！点着的蜡烛会一直烧，烧到最后就没有了；被吹灭的反而留了下来。' },
              { tag: '想一想', text: '还亮着的 5 支，到早上全烧光了；吹灭的 3 支好好地留在桌上。' },
              { tag: '验一验', text: '要是回答「5 支」，算的是夜里还亮着几支，可题目问的是早上剩几支。' },
              { tag: '答', text: '桌上还剩 3 支蜡烛。' }
            ]
          }
        },
        { heading: '记住口诀', chant: '题目读两遍，找出捣乱的；问啥就答啥，不掉陷阱里。' }
      ]
    },
    variants: [
      { id: 'age', setting: 'vXjAge', label: '年龄差不变', gen: genAge },
      { id: 'candle', setting: 'vXjCandle', label: '蜡烛陷阱', gen: genCandle },
      { id: 'share', setting: 'vXjShare', label: '分东西别忘了自己', gen: genShare }
    ],
    generate: function (s) {
      return U.generateFrom(XIANJING.variants, s)
    },
    titleFor: function (s) {
      return '趣味陷阱题练习 · ' + U.DIFF_LABEL[s.difficulty]
    }
  }

  root.SumSum.aoshu.topics.xianjing = XIANJING
  root.SumSum.aoshu.topicList.push(XIANJING)
})(typeof window !== 'undefined' ? window : globalThis)
