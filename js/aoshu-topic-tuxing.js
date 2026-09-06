/**
 * 知识点「09 图形找规律」：图形按固定顺序重复或按数量递增排列，找规律填下一个。
 * 图形用黑白打印安全的字符（●○△▲□■★☆◆）直接写进题干。
 * 变式：①周期重复 ②数量递增 ③第 N 个是什么（稍难默认关）。
 * 生成时校验「最小周期」：所给序列能被更短周期解释的（如 ●●●●）一律丢弃。
 */
(function (root) {
  'use strict'

  var U = root.SumSum.aoshu.util

  var GLYPHS = ['●', '○', '△', '▲', '□', '■', '★', '☆', '◆']

  /* 各难度档：周期上限 / 「第 N 个」的 N 上限 / 递增组的个数上限 */
  var CAPS = {
    L1: { pMax: 3, nMax: 15, growMax: 9 },
    L2: { pMax: 3, nMax: 24, growMax: 12 },
    L3: { pMax: 4, nMax: 30, growMax: 15 }
  }

  function caps(s) {
    return CAPS[s.difficulty] || CAPS.L1
  }

  /* 取 n 个互不相同的图形 */
  function pickGlyphs(n) {
    var pool = GLYPHS.slice()
    var out = []
    for (var i = 0; i < n; i++) {
      out.push(pool.splice(U.randInt(0, pool.length - 1), 1)[0])
    }
    return out
  }

  /* 一组图案：周期 2~4；周期 ≥3 时偶尔用「两同一异」形（如 ●●△） */
  function makePattern(p) {
    if (p >= 3 && Math.random() < 0.3) {
      var two = pickGlyphs(2)
      var arr = []
      for (var i = 0; i < p - 1; i++) arr.push(two[0])
      arr.push(two[1])
      return arr
    }
    return pickGlyphs(p)
  }

  /* 序列能否被比 p 更短的周期解释（能则这道题规律不唯一，丢弃） */
  function hasShorterPeriod(seq, p) {
    for (var q = 1; q < p; q++) {
      var ok = true
      for (var i = 0; i < seq.length; i++) {
        if (seq[i] !== seq[i % q]) {
          ok = false
          break
        }
      }
      if (ok) return true
    }
    return false
  }

  /* 把序列按 p 个一组用「｜」隔开，方便解析里「圈一圈」 */
  function grouped(seq, p) {
    var parts = []
    for (var i = 0; i < seq.length; i += p) {
      parts.push(seq.slice(i, i + p).join(''))
    }
    return parts.join('｜')
  }

  /* 变式①周期重复：给 2~3 个完整周期（可带零头），问下一个画什么 */
  function genRepeat(s) {
    var p = U.randInt(2, caps(s).pMax)
    var pattern = makePattern(p)
    var cycles = U.randInt(2, 3)
    var tail = U.randInt(0, Math.min(2, p - 1))
    var shownLen = cycles * p + tail
    var seq = []
    for (var i = 0; i < shownLen; i++) seq.push(pattern[i % p])
    if (hasShorterPeriod(seq, p)) return null
    var answer = pattern[shownLen % p]
    var patStr = pattern.join('')

    var calc =
      tail === 0
        ? '（　）前面正好圈完 ' + cycles + ' 组，新一组从头开始：第 1 个是 ' + answer + '。'
        : '最后一组已经画了 ' + tail + ' 个（' + seq.slice(shownLen - tail).join('') + '），接下来是组里的第 ' + (tail + 1) + ' 个：' + answer + '。'
    return {
      topic: 'tuxing',
      variant: 'repeat',
      stem: '找规律，接着画：' + seq.join('') + '（　）',
      answer: answer,
      unit: '',
      ansLabel: '答：（　）里画',
      ansSuffix: '。',
      workLabel: '规律',
      solution: [
        { tag: '想一想', text: '先看看是不是几个一组在重复，把一组一组圈出来。' },
        { tag: '找规律', text: '圈一圈：' + grouped(seq, p) + '——「' + patStr + '」' + p + ' 个一组，一遍一遍重复。' },
        { tag: '算一算', text: calc },
        { tag: '验一验', text: '把（　）填上再圈一遍：' + grouped(seq.concat([answer]), p) + '，每组顺序都对 ✓' },
        { tag: '答', text: '（　）里画 ' + answer + '。' }
      ],
      key: 'repeat:' + patStr + ':' + shownLen
    }
  }

  /* 变式②数量递增：每组比前一组多 d 个，问下一组画几个 */
  function genGrow(s) {
    var g = U.pick(GLYPHS)
    var a = U.randInt(1, 2)
    var d = U.randInt(1, s.difficulty === 'L1' ? 2 : 3)
    var answer = a + 3 * d
    if (answer > caps(s).growMax) return null
    var groups = []
    for (var i = 0; i < 3; i++) groups.push(g.repeat(a + i * d))
    return {
      topic: 'tuxing',
      variant: 'grow',
      stem: '找规律：' + groups.join('、') + '、（　）。下一组该画几个' + g + '？',
      answer: answer,
      unit: '个',
      ansLabel: '答：下一组画',
      ansSuffix: '个' + g + '。',
      workLabel: '规律',
      solution: [
        { tag: '想一想', text: '先数一数每组各有几个。' },
        { tag: '找规律', text: '第一组 ' + a + ' 个，第二组 ' + (a + d) + ' 个，第三组 ' + (a + 2 * d) + ' 个——每组比前一组多 ' + d + ' 个。' },
        { tag: '算一算', text: '下一组：' + (a + 2 * d) + ' + ' + d + ' = ' + answer + '（个）。' },
        { tag: '验一验', text: '倒回去查：' + answer + ' − ' + d + ' = ' + (a + 2 * d) + '，正好是第三组的个数 ✓' },
        { tag: '答', text: '下一组画 ' + answer + ' 个' + g + '。' }
      ],
      key: 'grow:' + g + ':' + a + ',' + d
    }
  }

  /* 变式③第 N 个是什么：给 2 个完整周期加省略号，问第 N 个图形 */
  function genNth(s) {
    var c = caps(s)
    var p = U.randInt(2, c.pMax)
    var pattern = makePattern(p)
    var twoCycles = []
    for (var i = 0; i < 2 * p; i++) twoCycles.push(pattern[i % p])
    if (hasShorterPeriod(twoCycles, p)) return null
    var N = U.randInt(2 * p + 1, c.nMax)
    var full = Math.floor(N / p)
    var r = N % p
    if (r === 0) full = full // 正好整组
    if (s.difficulty === 'L1' && full > 6) return null // 连加式别太长
    var answer = r === 0 ? pattern[p - 1] : pattern[r - 1]
    var patStr = pattern.join('')

    /* 圈一圈：L1 用连加；L2/L3 补一句除法 */
    var chainParts = []
    for (var j = 0; j < full; j++) chainParts.push(p)
    var chain = chainParts.join(' + ') + ' = ' + full * p
    var divNote = s.difficulty === 'L1' ? '' : '（也可以算：' + N + ' ÷ ' + p + ' = ' + full + ' 组' + (r > 0 ? '余 ' + r : '') + '）'
    var circle =
      r === 0
        ? p + ' 个一组：' + chain + '（个），第 ' + N + ' 个正好圈完 ' + full + ' 组，一个不剩' + divNote + '。'
        : p + ' 个一组：' + chain + '（个），圈完 ' + full + ' 组，还剩 ' + r + ' 个' + divNote + '。'
    var locate =
      r === 0
        ? '第 ' + N + ' 个正好是一组「' + patStr + '」里的最后一个：' + answer + '。'
        : '第 ' + N + ' 个是新一组「' + patStr + '」里的第 ' + r + ' 个：' + answer + '。'

    var check
    if (N <= 20) {
      var fullSeq = []
      for (var k = 0; k < N; k++) fullSeq.push(pattern[k % p])
      check = '把前 ' + N + ' 个都写出来：' + fullSeq.join('') + '，数到第 ' + N + ' 个正好是 ' + answer + ' ✓'
    } else {
      check = '换个方法查：第 ' + full * p + ' 个正好圈完一组（是 ' + pattern[p - 1] + '）' + (r > 0 ? '，再往后数 ' + r + ' 个就到第 ' + N + ' 个' : '') + ' ✓'
    }
    return {
      topic: 'tuxing',
      variant: 'nth',
      stem: '按 ' + twoCycles.join('') + '……的规律一直排下去，第 ' + N + ' 个是什么图形？',
      answer: answer,
      unit: '',
      ansLabel: '答：第 ' + N + ' 个是',
      ansSuffix: '。',
      workLabel: '规律',
      solution: [
        { tag: '想一想', text: '先圈出重复的一组：「' + patStr + '」' + p + ' 个一组。再看第 ' + N + ' 个落在第几组的第几个。' },
        { tag: '圈一圈', text: circle },
        { tag: '找位置', text: locate },
        { tag: '验一验', text: check },
        { tag: '答', text: '第 ' + N + ' 个是 ' + answer + '。' }
      ],
      key: 'nth:' + patStr + ':' + N
    }
  }

  var TUXING = {
    id: 'tuxing',
    no: '09',
    stage: 'L1',
    name: '图形找规律',
    lesson: {
      title: '图形找规律 · 方法讲解',
      sections: [
        {
          heading: '这是什么问题？',
          paras: ['图形也会排队！●△●△……它们按一个固定的顺序一遍一遍重复，或者一组比一组多。找到排队的规律，就知道下一个该画什么。']
        },
        {
          heading: '怎么想？',
          paras: [
            '第一招：把重复的一组圈出来——先问自己「几个一组？」，再一组一组地圈。',
            '第二招：如果不是重复，就数一数每组的个数，看看是不是每组都多几个。'
          ]
        },
        {
          heading: '例题示范',
          example: {
            stem: '找规律，接着画：●△●△●△（　）',
            solution: [
              { tag: '想一想', text: '先看看是不是几个一组在重复，把一组一组圈出来。' },
              { tag: '找规律', text: '圈一圈：●△｜●△｜●△——「●△」两个一组，一遍一遍重复。' },
              { tag: '算一算', text: '（　）前面正好圈完 3 组，新一组从头开始：第 1 个是 ●。' },
              { tag: '验一验', text: '把（　）填上再圈：●△｜●△｜●△｜●，顺序都对 ✓' },
              { tag: '答', text: '（　）里画 ●。' }
            ]
          }
        },
        { heading: '记住口诀', chant: '几个一组圈一圈，圈到最后看零头。' }
      ]
    },
    variants: [
      { id: 'repeat', setting: 'vTxRepeat', label: '周期重复（接着画）', gen: genRepeat },
      { id: 'grow', setting: 'vTxGrow', label: '数量递增（下一组几个）', gen: genGrow },
      { id: 'nth', setting: 'vTxNth', label: '第 N 个是什么', def: false, gen: genNth }
    ],
    generate: function (s) {
      return U.generateFrom(TUXING.variants, s)
    },
    titleFor: function (s) {
      return '图形找规律练习 · ' + U.DIFF_LABEL[s.difficulty]
    }
  }

  root.SumSum.aoshu.topics.tuxing = TUXING
  root.SumSum.aoshu.topicList.push(TUXING)
})(typeof window !== 'undefined' ? window : globalThis)
