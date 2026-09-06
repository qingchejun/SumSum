/**
 * 知识点「36 错中求解问题」（L2）：小马虎算错了，从错误结果推出正确答案。
 * 变式：①看错数字（加数/减数/被减数）②看错运算符号 ③抄反数位（默认关）。
 * 构造时先取真数算出真果与错果，解析用「先从错果找回没看错的数，再重算」两步法，
 * 「验一验」把找回的数代回错误算式核对——真数全程可复原，说服力就在这里。
 */
(function (root) {
  'use strict'

  var U = root.SumSum.aoshu.util

  /* 变式①看错数字：三种形态（看错加数 / 看错减数 / 看错被减数） */
  function genWrongNum(s) {
    var cap = U.diff(s).numMax
    var form = U.pick(['add', 'subsub', 'submin'])
    var delta = U.randInt(1, 5)
    var up = Math.random() < 0.5

    if (form === 'add') {
      /* 真算式 a + b = t；把 b 看成 bp，错果 w = a + bp */
      var b = U.randInt(2, Math.floor(cap / 2))
      var bp = up ? b + delta : b - delta
      if (bp < 1) return null
      var a = U.randInt(2, cap - Math.max(b, bp))
      var t = a + b
      var w = a + bp
      return {
        topic: 'cuozhong',
        variant: 'wrongnum',
        stem: '小马虎算加法时，把加数 ' + b + ' 看成了 ' + bp + '，算出的结果是 ' + w + '。正确的结果应该是几？',
        answer: t,
        unit: '',
        ansLabel: '答：正确的结果是',
        ansSuffix: '。',
        solution: [
          {
            tag: '想一想',
            text:
              '把 ' + b + ' 看成了 ' + bp + '，' +
              (up ? '多加了 ' + delta + '，结果就大了 ' + delta : '少加了 ' + delta + '，结果就小了 ' + delta) + '。'
          },
          { tag: '第 1 步', text: '先用错的结果找回另一个加数：' + w + ' − ' + bp + ' = ' + a + '。' },
          { tag: '第 2 步', text: '用对的数再算：' + a + ' + ' + b + ' = ' + t + '。' },
          { tag: '验一验', text: a + ' + ' + bp + ' = ' + w + '，正好是小马虎的错结果 ✓' },
          { tag: '答', text: '正确的结果是 ' + t + '。' }
        ],
        key: 'num:add:' + b + ',' + bp + ',' + w
      }
    }

    if (form === 'subsub') {
      /* 真算式 a − b = t；把减数 b 看成 bp，错果 w = a − bp */
      var b2 = U.randInt(2, Math.floor(cap / 2))
      var bp2 = up ? b2 + delta : b2 - delta
      if (bp2 < 1) return null
      var a2 = U.randInt(Math.max(b2, bp2) + 1, cap)
      var t2 = a2 - b2
      var w2 = a2 - bp2
      return {
        topic: 'cuozhong',
        variant: 'wrongnum',
        stem: '小马虎算减法时，把减数 ' + b2 + ' 看成了 ' + bp2 + '，算出的结果是 ' + w2 + '。正确的结果应该是几？',
        answer: t2,
        unit: '',
        ansLabel: '答：正确的结果是',
        ansSuffix: '。',
        solution: [
          {
            tag: '想一想',
            text:
              '减数看' + (up ? '大' : '小') + '了：' +
              (up ? '多减了 ' + delta + '，结果就小了 ' + delta : '少减了 ' + delta + '，结果就大了 ' + delta) + '。'
          },
          { tag: '第 1 步', text: '先用错的结果找回被减数：' + w2 + ' + ' + bp2 + ' = ' + a2 + '。' },
          { tag: '第 2 步', text: '用对的减数再算：' + a2 + ' − ' + b2 + ' = ' + t2 + '。' },
          { tag: '验一验', text: a2 + ' − ' + bp2 + ' = ' + w2 + '，正好是小马虎的错结果 ✓' },
          { tag: '答', text: '正确的结果是 ' + t2 + '。' }
        ],
        key: 'num:subsub:' + b2 + ',' + bp2 + ',' + w2
      }
    }

    /* submin：真算式 a − b = t；把被减数 a 看成 ap，错果 w = ap − b */
    var a3 = U.randInt(Math.floor(cap / 2), cap - delta)
    var ap = up ? a3 + delta : a3 - delta
    var b3 = U.randInt(2, Math.min(a3, ap) - 1)
    if (b3 < 2) return null
    var t3 = a3 - b3
    var w3 = ap - b3
    return {
      topic: 'cuozhong',
      variant: 'wrongnum',
      stem: '小马虎算减法时，把被减数 ' + a3 + ' 看成了 ' + ap + '，算出的结果是 ' + w3 + '。正确的结果应该是几？',
      answer: t3,
      unit: '',
      ansLabel: '答：正确的结果是',
      ansSuffix: '。',
      solution: [
        {
          tag: '想一想',
          text:
            '被减数看' + (up ? '大' : '小') + '了 ' + delta + '，减掉的没变，结果就' +
            (up ? '大' : '小') + '了 ' + delta + '。'
        },
        { tag: '第 1 步', text: '先用错的结果找回减数：' + ap + ' − ' + w3 + ' = ' + b3 + '。' },
        { tag: '第 2 步', text: '用对的被减数再算：' + a3 + ' − ' + b3 + ' = ' + t3 + '。' },
        { tag: '验一验', text: ap + ' − ' + b3 + ' = ' + w3 + '，正好是小马虎的错结果 ✓' },
        { tag: '答', text: '正确的结果是 ' + t3 + '。' }
      ],
      key: 'num:submin:' + a3 + ',' + ap + ',' + w3
    }
  }

  /* 变式②看错运算符号：该加算成减（或该减算成加），一来一回差两个 d */
  function genWrongOp(s) {
    var cap = U.diff(s).numMax
    var d = U.randInt(2, Math.floor(cap / 3))
    var shouldAdd = Math.random() < 0.5

    if (shouldAdd) {
      /* 真算式 x + d；错算 x − d = w */
      var x = U.randInt(d + 1, cap - d)
      var w = x - d
      var t = x + d
      return {
        topic: 'cuozhong',
        variant: 'wrongop',
        stem: '小马虎本来要算「一个数 + ' + d + '」，却错算成了「− ' + d + '」，得到 ' + w + '。正确的结果应该是几？',
        answer: t,
        unit: '',
        ansLabel: '答：正确的结果是',
        ansSuffix: '。',
        solution: [
          { tag: '想一想', text: '该加 ' + d + ' 的，反而减了 ' + d + '——先把原来的数找回来，再重算一遍。' },
          { tag: '第 1 步', text: '错算是减 ' + d + '，倒回去加：原来的数 = ' + w + ' + ' + d + ' = ' + x + '。' },
          { tag: '第 2 步', text: '用原来的数算对的：' + x + ' + ' + d + ' = ' + t + '。' },
          { tag: '验一验', text: x + ' − ' + d + ' = ' + w + '，正好是错结果 ✓（一来一回，正确结果比错结果多了两个 ' + d + '）' },
          { tag: '答', text: '正确的结果是 ' + t + '。' }
        ],
        key: 'op:add:' + d + ',' + w
      }
    }

    /* 真算式 x − d；错算 x + d = w */
    var x2 = U.randInt(d + 1, cap - d)
    var w2 = x2 + d
    var t2 = x2 - d
    if (t2 < 1) return null
    return {
      topic: 'cuozhong',
      variant: 'wrongop',
      stem: '小马虎本来要算「一个数 − ' + d + '」，却错算成了「+ ' + d + '」，得到 ' + w2 + '。正确的结果应该是几？',
      answer: t2,
      unit: '',
      ansLabel: '答：正确的结果是',
      ansSuffix: '。',
      solution: [
        { tag: '想一想', text: '该减 ' + d + ' 的，反而加了 ' + d + '——先把原来的数找回来，再重算一遍。' },
        { tag: '第 1 步', text: '错算是加 ' + d + '，倒回去减：原来的数 = ' + w2 + ' − ' + d + ' = ' + x2 + '。' },
        { tag: '第 2 步', text: '用原来的数算对的：' + x2 + ' − ' + d + ' = ' + t2 + '。' },
        { tag: '验一验', text: x2 + ' + ' + d + ' = ' + w2 + '，正好是错结果 ✓（一来一回，正确结果比错结果少了两个 ' + d + '）' },
        { tag: '答', text: '正确的结果是 ' + t2 + '。' }
      ],
      key: 'op:sub:' + d + ',' + w2
    }
  }

  /* 变式③抄反数位：把两位数 m 抄成 s（十位个位对调），错果 w = c + s */
  function genSwap(s) {
    var p = U.randInt(1, 9)
    var q = U.randInt(1, 9)
    if (p === q) return null
    var m = 10 * p + q
    var sw = 10 * q + p
    var cMax = 99 - Math.max(m, sw)
    if (cMax < 2) return null
    var c = U.randInt(2, s.difficulty === 'L1' ? Math.min(9, cMax) : cMax)
    var w = c + sw
    var t = c + m
    return {
      topic: 'cuozhong',
      variant: 'swap',
      stem: '小马虎算加法时，把加数 ' + m + ' 的两个数字抄反了，抄成了 ' + sw + '，算出的结果是 ' + w + '。正确的结果应该是几？',
      answer: t,
      unit: '',
      ansLabel: '答：正确的结果是',
      ansSuffix: '。',
      solution: [
        { tag: '想一想', text: '数字抄反：' + m + ' 变成了 ' + sw + '，' + (sw > m ? '多算了 ' : '少算了 ') + Math.abs(sw - m) + '。' },
        { tag: '第 1 步', text: '先用错的结果找回另一个加数：' + w + ' − ' + sw + ' = ' + c + '。' },
        { tag: '第 2 步', text: '用对的数再算：' + c + ' + ' + m + ' = ' + t + '。' },
        { tag: '验一验', text: c + ' + ' + sw + ' = ' + w + '，正好是小马虎的错结果 ✓' },
        { tag: '答', text: '正确的结果是 ' + t + '。' }
      ],
      key: 'swap:' + m + ',' + w
    }
  }

  var CUOZHONG = {
    id: 'cuozhong',
    no: '36',
    stage: 'L2',
    name: '错中求解问题',
    lesson: {
      title: '错中求解 · 方法讲解',
      sections: [
        {
          heading: '这是什么问题？',
          paras: ['小马虎把数字看错、符号看错，算出了一个错结果。别急着重头再来——错结果里藏着线索，能把正确答案「救」回来。']
        },
        {
          heading: '怎么想？',
          paras: [
            '第一步：弄清楚错在哪、错了多少（看错的数差几？该加的算成减差几？）。',
            '第二步：用错结果把「没看错的那个数」先找回来，再用对的数重新算一遍。算完把找回的数代回错算式——对得上，才放心。'
          ]
        },
        {
          heading: '例题示范',
          example: {
            stem: '小马虎算加法时，把加数 6 看成了 9，算出的结果是 25。正确的结果应该是几？',
            solution: [
              { tag: '想一想', text: '把 6 看成了 9，多加了 3，结果就大了 3。' },
              { tag: '第 1 步', text: '先用错的结果找回另一个加数：25 − 9 = 16。' },
              { tag: '第 2 步', text: '用对的数再算：16 + 6 = 22。' },
              { tag: '验一验', text: '16 + 9 = 25，正好是小马虎的错结果 ✓' },
              { tag: '答', text: '正确的结果是 22。' }
            ]
          }
        },
        { heading: '记住口诀', chant: '错果不白错，真数找回来；换上对的数，一算就明白。' }
      ]
    },
    variants: [
      { id: 'wrongnum', setting: 'vCzWrongNum', label: '看错数字', gen: genWrongNum },
      { id: 'wrongop', setting: 'vCzWrongOp', label: '看错运算符号', gen: genWrongOp },
      { id: 'swap', setting: 'vCzSwap', label: '抄反数位（两位数）', def: false, gen: genSwap }
    ],
    generate: function (s) {
      return U.generateFrom(CUOZHONG.variants, s)
    },
    titleFor: function (s) {
      return '错中求解练习 · ' + U.DIFF_LABEL[s.difficulty]
    }
  }

  root.SumSum.aoshu.topics.cuozhong = CUOZHONG
  root.SumSum.aoshu.topicList.push(CUOZHONG)
})(typeof window !== 'undefined' ? window : globalThis)
