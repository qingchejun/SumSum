/**
 * 知识点「34 统筹优化初步」：合理安排先后与并行，让总时间最少。
 * 变式：①沏茶（等水开时做小事）②排队接水（接得快的先接）③烙饼（锅不空着，def:false）。
 * 答案全部由程序按最优方案独立计算；排队变式在生成时枚举全部顺序验证最小值。
 */
(function (root) {
  'use strict'

  var U = root.SumSum.aoshu.util

  /* 各难度档的时间参数范围：boil 烧水分钟数，water 接水分钟数 */
  var CFG = {
    L1: { boil: [6, 8], water: [1, 6] },
    L2: { boil: [6, 12], water: [1, 9] },
    L3: { boil: [8, 15], water: [2, 12] }
  }

  function cfg(s) {
    return CFG[s.difficulty] || CFG.L1
  }

  /* 抽三个互不相同的人名 */
  function pickThreeNames() {
    var out = []
    while (out.length < 3) {
      var n = U.pick(U.NAMES)
      if (out.indexOf(n) < 0) out.push(n)
    }
    return out
  }

  function permutations(arr) {
    if (arr.length <= 1) return [arr]
    var out = []
    arr.forEach(function (x, i) {
      var rest = arr.slice(0, i).concat(arr.slice(i + 1))
      permutations(rest).forEach(function (p) {
        out.push([x].concat(p))
      })
    })
    return out
  }

  /* 变式①沏茶：烧水时同时洗茶杯拿茶叶，最少 = 洗壶 + 烧水 + 泡茶 */
  function genTea(s) {
    var c0 = cfg(s)
    var w = U.randInt(1, 3)
    var b = U.randInt(c0.boil[0], c0.boil[1])
    var c = U.randInt(1, 3)
    var t = U.randInt(1, 2)
    var p = U.randInt(1, 2)
    if (c + t > b) return null // 等水开的时间必须够做完小事
    var ans = w + b + p
    var slow = w + b + c + t + p
    return {
      topic: 'tongchou',
      variant: 'tea',
      stem:
        '给客人沏茶：洗水壶要 ' + w + ' 分钟，烧水要 ' + b + ' 分钟，洗茶杯要 ' + c +
        ' 分钟，拿茶叶要 ' + t + ' 分钟，泡茶要 ' + p +
        ' 分钟。烧水的时候可以同时做别的事，最少要多少分钟能喝上茶？',
      answer: ans,
      unit: '分钟',
      ansLabel: '答：最少要',
      ansSuffix: '分钟。',
      solution: [
        { tag: '想一想', text: '烧水要等 ' + b + ' 分钟——等水开的时候手别闲着，把小事都塞进这段时间里。' },
        {
          tag: '安排',
          text:
            '先洗水壶（' + w + ' 分钟）→ 烧水（' + b + ' 分钟），趁烧水洗茶杯、拿茶叶（' +
            c + ' + ' + t + ' = ' + (c + t) + ' 分钟，比 ' + b + ' 分钟短，来得及）→ 水开后泡茶（' + p + ' 分钟）。'
        },
        { tag: '列算式', text: w + ' + ' + b + ' + ' + p + ' = ' + ans + '（分钟）。' },
        {
          tag: '验一验',
          text:
            '要是一件一件做：' + w + ' + ' + b + ' + ' + c + ' + ' + t + ' + ' + p + ' = ' + slow +
            '（分钟），统筹安排正好省下洗茶杯和拿茶叶的 ' + (c + t) + ' 分钟 ✓'
        },
        { tag: '答', text: '最少要 ' + ans + ' 分钟。' }
      ],
      key: 'tea:' + [w, b, c, t, p].join(',')
    }
  }

  /* 变式②排队接水：从快到慢排，总等候最少 = 2×最短 + 中间（生成时枚举 6 种顺序验证） */
  function genQueue(s) {
    var c0 = cfg(s)
    var lo = c0.water[0]
    var hi = c0.water[1]
    if (hi - lo < 2) return null
    var x = U.randInt(lo, hi - 2)
    var y = U.randInt(x + 1, hi - 1)
    var z = U.randInt(y + 1, hi)
    var ans = 2 * x + y

    /* 枚举全部 6 种顺序，独立验证最优值 */
    var best = Infinity
    permutations([x, y, z]).forEach(function (o) {
      var total = 2 * o[0] + o[1]
      if (total < best) best = total
    })
    if (best !== ans) return null // 理论上不会发生，双保险

    var names = pickThreeNames()
    var times = [x, y, z]
    /* 题面里人和时间的对应随机打乱（与最优顺序无关） */
    var order = permutations([0, 1, 2])[U.randInt(0, 5)]
    var personTime = {}
    names.forEach(function (n, i) {
      personTime[n] = times[order[i]]
    })
    /* 最优顺序：按时间从短到长排人名 */
    var sorted = names.slice().sort(function (a, b) {
      return personTime[a] - personTime[b]
    })
    var sx = sorted[0]
    var sy = sorted[1]
    var sz = sorted[2]

    return {
      topic: 'tongchou',
      variant: 'queue',
      stem:
        names[0] + '、' + names[1] + '、' + names[2] + ' 三人到饮水机接水，接满分别需要 ' +
        personTime[names[0]] + ' 分钟、' + personTime[names[1]] + ' 分钟、' + personTime[names[2]] +
        ' 分钟，饮水机一次只能一个人接。怎样安排先后顺序，三人等候的时间合起来最少？最少一共等候几分钟？',
      answer: ans,
      unit: '分钟',
      ansLabel: '答：最少一共等候',
      ansSuffix: '分钟。',
      solution: [
        { tag: '想一想', text: '一个人接水时，排在后面的人都得等——让接得快的先接，后面的人才等得短。' },
        { tag: '排一排', text: '按接水时间从短到长排：' + sx + '（' + x + ' 分钟）→ ' + sy + '（' + y + ' 分钟）→ ' + sz + '（' + z + ' 分钟）。' },
        {
          tag: '列算式',
          text:
            sx + ' 不用等；' + sy + ' 等 ' + x + ' 分钟；' + sz + ' 等 ' + x + ' + ' + y + ' = ' + (x + y) +
            ' 分钟。合起来：' + x + ' + ' + (x + y) + ' = ' + ans + '（分钟）。'
        },
        {
          tag: '验一验',
          text:
            '换个顺序试试——让最慢的 ' + sz + ' 先接：' + sy + ' 等 ' + z + ' 分钟，' + sx + ' 等 ' + z + ' + ' + y +
            ' = ' + (z + y) + ' 分钟，合起来 ' + (2 * z + y) + ' 分钟，比 ' + ans + ' 分钟多 ✓'
        },
        { tag: '答', text: '按 ' + sx + ' → ' + sy + ' → ' + sz + ' 的顺序接，最少一共等候 ' + ans + ' 分钟。' }
      ],
      key: 'queue:' + x + ',' + y + ',' + z
    }
  }

  /* 变式③烙饼：锅每次 2 张，n 张 2n 个面 → 最少 n 次锅（n 取 3、5，交替法才有味道） */
  function genPan(s) {
    var f = U.randInt(2, 6)
    var n = U.pick([3, 5])
    var ans = n * f
    var plan =
      n === 3
        ? '第 1 次锅：饼①正面 + 饼②正面；第 2 次锅：饼①反面 + 饼③正面；第 3 次锅：饼②反面 + 饼③反面——3 次锅正好把 6 个面全烙完。'
        : '先把饼①、饼②一起烙完两面（2 次锅）；剩下 3 张用交替法（3 次锅：①正②正 → ①反③正 → ②反③反的排法）——一共 5 次锅。'
    var check =
      n === 3
        ? '要是先烙①②、再单独烙③：③一张占一次锅，两面要 2 次锅，一共 4 次锅 = ' + 4 * f + ' 分钟，比 ' + ans + ' 分钟慢 ✓'
        : '10 个面，每次锅最多烙 2 个面，至少 5 次锅，一次也没浪费，不可能更快 ✓'
    return {
      topic: 'tongchou',
      variant: 'pan',
      stem:
        '平底锅一次能烙 2 张饼，烙熟一面要 ' + f + ' 分钟，每张饼都要烙正反两面。烙 ' + n +
        ' 张饼，最少要多少分钟？',
      answer: ans,
      unit: '分钟',
      ansLabel: '答：最少要',
      ansSuffix: '分钟。',
      solution: [
        { tag: '想一想', text: '锅里能放 2 张，就别让它只烙 1 张——每次锅里都放满，一个面也不浪费。' },
        {
          tag: '算面数',
          text:
            n + ' 张饼每张 2 个面，共 ' + 2 * n + ' 个面；锅每 ' + f + ' 分钟能烙 2 个面，至少要 ' + n +
            ' 次锅：' + n + ' × ' + f + ' = ' + ans + '（分钟）。'
        },
        { tag: '安排', text: plan },
        { tag: '验一验', text: check },
        { tag: '答', text: '最少要 ' + ans + ' 分钟。' }
      ],
      key: 'pan:' + n + ',' + f
    }
  }

  var TONGCHOU = {
    id: 'tongchou',
    no: '34',
    stage: 'L2',
    name: '统筹优化初步',
    lesson: {
      title: '统筹优化 · 方法讲解',
      sections: [
        {
          heading: '这是什么问题？',
          paras: [
            '做一件事要好几步：有的步骤只能干等（比如烧水），有的地方一次能做两份（比如锅能放两张饼）。合理安排顺序，总时间就能变少——这就是统筹。'
          ]
        },
        {
          heading: '怎么想？',
          paras: [
            '第一步：找出「需要干等」的步骤，把别的小事塞进等待的时间里，让两件事同时进行。',
            '第二步：看看有没有「一次能做两份」的地方（锅、桌子、机器），别让它空着。'
          ]
        },
        {
          heading: '例题示范',
          example: {
            stem: '沏茶：洗水壶 2 分钟，烧水 8 分钟，洗茶杯 2 分钟，拿茶叶 1 分钟，泡茶 1 分钟。烧水时可以做别的事，最少要几分钟？',
            solution: [
              { tag: '想一想', text: '烧水的 8 分钟是干等的——把洗茶杯、拿茶叶塞进去。' },
              { tag: '安排', text: '洗水壶（2 分钟）→ 烧水（8 分钟，同时洗茶杯、拿茶叶共 3 分钟，来得及）→ 泡茶（1 分钟）。' },
              { tag: '列算式', text: '2 + 8 + 1 = 11（分钟）。' },
              { tag: '验一验', text: '一件一件做要 2 + 8 + 2 + 1 + 1 = 14 分钟，统筹省了 3 分钟 ✓' },
              { tag: '答', text: '最少要 11 分钟。' }
            ]
          }
        },
        { heading: '记住口诀', chant: '干等的时间别浪费，能塞的小事塞进去。' }
      ]
    },
    variants: [
      { id: 'tea', setting: 'vTcTea', label: '沏茶问题（等水时做小事）', gen: genTea },
      { id: 'queue', setting: 'vTcQueue', label: '排队接水（快的先接）', gen: genQueue },
      { id: 'pan', setting: 'vTcPan', label: '烙饼问题（锅不空着）', def: false, gen: genPan }
    ],
    generate: function (s) {
      return U.generateFrom(TONGCHOU.variants, s)
    },
    titleFor: function (s) {
      return '统筹优化练习 · ' + U.DIFF_LABEL[s.difficulty]
    }
  }

  root.SumSum.aoshu.topics.tongchou = TONGCHOU
  root.SumSum.aoshu.topicList.push(TONGCHOU)
})(typeof window !== 'undefined' ? window : globalThis)
