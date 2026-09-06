/**
 * 知识点「39 排序推理」：由「谁比谁高/快」等条件推出顺序。
 * 变式：①三人两条件求最高/最矮 ②四人三条件排完整顺序 ③赛跑名次（含否定条件，def:false）。
 * 每道题生成时都枚举全部排列，验证被问的结论唯一确定（多解/无解丢弃重出）。
 * key 里带完整条件签名，外部测试可独立重新枚举复核。
 */
(function (root) {
  'use strict'

  var U = root.SumSum.aoshu.util

  /* 比较的主题：more 是「占优」方向的形容词 */
  var ATTRS = [
    { theme: '比身高', more: '高', less: '矮', top: '最高', bottom: '最矮', second: '第 2 高' },
    { theme: '比年龄', more: '大', less: '小', top: '最大', bottom: '最小', second: '第 2 大' },
    { theme: '赛跑', more: '快', less: '慢', top: '跑得最快', bottom: '跑得最慢', second: '第 2 名' }
  ]

  function pickNames(n) {
    var out = []
    while (out.length < n) {
      var x = U.pick(U.NAMES)
      if (out.indexOf(x) < 0) out.push(x)
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

  /* 条件 {t, s}：t 排在 s 前面（t 比 s 更「more」）；perm[0] 是最占优的人 */
  function satisfies(perm, cond) {
    return perm.indexOf(cond.t) < perm.indexOf(cond.s)
  }

  /* 条件的题面说法：随机用「t 比 s 高」或「s 比 t 矮」（只随机一次，题面与验算共用同一句） */
  function condText(cond, at) {
    return Math.random() < 0.5
      ? cond.t + '比' + cond.s + at.more
      : cond.s + '比' + cond.t + at.less
  }

  /* 变式①：三人、两句话，问最高（或最矮） */
  function genTall(s) {
    var at = U.pick(ATTRS)
    var names = pickNames(3)
    var truth = permutations(names)[U.randInt(0, 5)] // truth[0] 最占优
    /* 三对里随机选两对（必共享一个人），按真实顺序定方向 */
    var pairs = [[0, 1], [0, 2], [1, 2]]
    var take = pairs.slice()
    take.splice(U.randInt(0, 2), 1)
    var conds = take.map(function (pr) {
      var a = names[pr[0]]
      var b = names[pr[1]]
      return truth.indexOf(a) < truth.indexOf(b) ? { t: a, s: b } : { t: b, s: a }
    })

    /* 分类：链式 / 双赢家 / 双输家，并决定能问什么 */
    var ask
    var reason
    if (conds[0].t === conds[1].t) {
      ask = 'top'
      var w = conds[0].t
      reason =
        '两句话说的都是' + w + '：' + w + '比' + conds[0].s + at.more + '，也比' +
        conds[1].s + at.more + '——另外两人都被' + w + '比下去了。'
    } else if (conds[0].s === conds[1].s) {
      ask = 'bottom'
      var l = conds[0].s
      reason =
        '两句话里' + l + '都吃亏：比' + conds[0].t + at.less + '，也比' +
        conds[1].t + at.less + '——谁都排在' + l + '前面。'
    } else {
      /* 链式：上游那句的输家是下游那句的赢家 */
      var first = conds[0].s === conds[1].t ? conds[0] : conds[1]
      var secnd = first === conds[0] ? conds[1] : conds[0]
      if (first.s !== secnd.t) return null // 不构成链（理论到不了这里）
      ask = U.pick(['top', 'bottom'])
      reason =
        '把两句话串成一串：' + first.t + '比' + first.s + at.more + '，' + first.s +
        '又比' + secnd.s + at.more + '——顺序就是' + first.t + ' → ' + first.s + ' → ' + secnd.s + '。'
    }

    /* 枚举 6 种排列，验证被问的那一端唯一确定 */
    var ok = permutations(names).filter(function (p) {
      return satisfies(p, conds[0]) && satisfies(p, conds[1])
    })
    if (ok.length === 0) return null
    var targets = {}
    ok.forEach(function (p) {
      targets[ask === 'top' ? p[0] : p[2]] = true
    })
    var keys = Object.keys(targets)
    if (keys.length !== 1) return null
    var answer = keys[0]

    var askWord = ask === 'top' ? at.top : at.bottom
    var condSig = conds
      .map(function (c) {
        return c.t + '>' + c.s
      })
      .join('|')
    var texts = [condText(conds[0], at), condText(conds[1], at)]
    return {
      topic: 'paixu',
      variant: 'tall',
      stem:
        names.join('、') + '三人' + at.theme + '。' + texts[0] + '，' +
        texts[1] + '。三人中' + askWord + '的是谁？',
      answer: answer,
      unit: '',
      ansLabel: '答：' + askWord + '的是',
      ansSuffix: '。',
      workLabel: '排一排',
      solution: [
        { tag: '想一想', text: '把每句话都读成「谁排前面、谁排后面」，再拼起来看。' },
        { tag: '推一推', text: reason },
        {
          tag: '验一验',
          text: '再把两句话读一遍：「' + texts[0] + '」「' + texts[1] + '」，和推出来的结论都对得上 ✓'
        },
        { tag: '答', text: askWord + '的是' + answer + '。' }
      ],
      key: 'tall:' + at.theme + ':' + names.join(',') + ':' + condSig + ':' + ask
    }
  }

  /* 变式②：四人、三句话，唯一确定完整顺序后问第 2 / 最末 */
  function genOrder(s) {
    var at = U.pick(ATTRS)
    var names = pickNames(4)
    var truth = permutations(names)[U.randInt(0, 23)]
    /* 六对里随机选三对，按真实顺序定方向 */
    var allPairs = []
    for (var i = 0; i < 4; i++) {
      for (var j = i + 1; j < 4; j++) allPairs.push([names[i], names[j]])
    }
    var idxs = []
    while (idxs.length < 3) {
      var k = U.randInt(0, allPairs.length - 1)
      if (idxs.indexOf(k) < 0) idxs.push(k)
    }
    var conds = idxs.map(function (k) {
      var a = allPairs[k][0]
      var b = allPairs[k][1]
      return truth.indexOf(a) < truth.indexOf(b) ? { t: a, s: b } : { t: b, s: a }
    })

    /* 枚举 24 种排列，要求完整顺序唯一 */
    var ok = permutations(names).filter(function (p) {
      return conds.every(function (c) {
        return satisfies(p, c)
      })
    })
    if (ok.length !== 1) return null
    var order = ok[0]

    /* 逐名淘汰式推导：每一步「剩下的人里没有谁压过 X」必须唯一成立，保证讲解不跳步 */
    var steps = []
    var remain = names.slice()
    for (var r = 1; r <= 3; r++) {
      var active = conds.filter(function (c) {
        return remain.indexOf(c.t) >= 0 && remain.indexOf(c.s) >= 0
      })
      var free = remain.filter(function (nm) {
        return !active.some(function (c) {
          return c.s === nm
        })
      })
      if (free.length !== 1) return null // 推导会卡壳的组合不出
      var x = free[0]
      steps.push(
        (r === 1 ? '三句话里' : '去掉已排好的再看，剩下的人里') +
        '没有谁' + at.more + '过' + x + '——' + x + '排第 ' + r + '。'
      )
      remain.splice(remain.indexOf(x), 1)
    }
    steps.push('最后剩下' + remain[0] + '，排第 4。')

    var askKind = U.pick(['r2', 'bottom'])
    var answer = askKind === 'r2' ? order[1] : order[3]
    var askWord = askKind === 'r2' ? at.second : at.bottom
    var condTexts = conds.map(function (c) {
      return condText(c, at)
    })
    return {
      topic: 'paixu',
      variant: 'order',
      stem:
        names.join('、') + '四人' + at.theme + '。' + condTexts.join('，') + '。' +
        askWord + '的是谁？',
      answer: answer,
      unit: '',
      ansLabel: '答：' + askWord + '的是',
      ansSuffix: '。',
      workLabel: '排一排',
      solution: [
        { tag: '想一想', text: '先找谁都压不过的那个人，把 TA 排第 1；拿走 TA，再找下一个。' },
        { tag: '推一推', text: steps.join('') + '完整顺序：' + order.join(' → ') + '。' },
        { tag: '验一验', text: '把三句话逐条对照这个顺序，全都符合 ✓' },
        { tag: '答', text: askWord + '的是' + answer + '。' }
      ],
      key: 'order:' + at.theme + ':' + names.join(',') + ':' + conds.map(function (c) { return c.t + '>' + c.s }).join('|') + ':' + askKind
    }
  }

  /* 变式③赛跑名次：肯定 + 否定 + 比较混合条件（def:false） */
  function genRace(s) {
    var names = pickNames(4)
    var truth = permutations(names)[U.randInt(0, 23)] // truth[k] 是第 k+1 名
    var rf = U.randInt(1, 4)
    var pf = truth[rf - 1] // 「pf 是第 rf 名」
    var others = names.filter(function (n) {
      return n !== pf
    })
    var nb = U.pick(others.filter(function (n) {
      return n !== truth[0]
    }))
    if (!nb) return null // 「nb 不是第 1 名」必须为真
    /* 比较条件：从其余人里挑一对（都不等于 pf），按真实名次定方向 */
    var cmpPool = []
    others.forEach(function (a) {
      others.forEach(function (b) {
        if (a !== b && truth.indexOf(a) < truth.indexOf(b)) cmpPool.push({ t: a, s: b })
      })
    })
    if (cmpPool.length === 0) return null
    var cmp = U.pick(cmpPool)

    /* 枚举 24 种名次，要求唯一 */
    var ok = permutations(names).filter(function (p) {
      if (p[rf - 1] !== pf) return false
      if (p[0] === nb) return false
      return p.indexOf(cmp.t) < p.indexOf(cmp.s)
    })
    if (ok.length !== 1) return null

    /* 按名次逐格推导，每一格的其他候选人必须能用某一条条件当场排除 */
    var steps = ['先用最确定的：' + pf + '是第 ' + rf + ' 名，把这一格先填上。']
    var remain = names.filter(function (n) {
      return n !== pf
    })
    for (var k = 1; k <= 4; k++) {
      if (k === rf) continue
      var x = truth[k - 1]
      var reasons = []
      var bad = false
      remain.forEach(function (y) {
        if (y === x) return
        if (k === 1 && y === nb) {
          reasons.push(y + '不是第 1 名')
        } else if (y === cmp.s && remain.indexOf(cmp.t) >= 0) {
          reasons.push(y + '比' + cmp.t + '慢，前面还得有' + cmp.t)
        } else {
          bad = true
        }
      })
      if (bad) return null // 没法当场讲清楚的组合不出
      steps.push(
        '第 ' + k + ' 名：' +
        (reasons.length ? reasons.join('；') + '——只能是' + x + '。' : '剩下的只有' + x + '。')
      )
      remain.splice(remain.indexOf(x), 1)
    }

    var askRanks = [1, 2, 3, 4].filter(function (r) {
      return r !== rf
    })
    var askRank = U.pick(askRanks)
    var answer = truth[askRank - 1]
    return {
      topic: 'paixu',
      variant: 'race',
      stem:
        names.join('、') + '四人赛跑。' + pf + '是第 ' + rf + ' 名，' + nb + '不是第 1 名，' +
        cmp.t + '比' + cmp.s + '快。第 ' + askRank + ' 名是谁？',
      answer: answer,
      unit: '',
      ansLabel: '答：第 ' + askRank + ' 名是',
      ansSuffix: '。',
      workLabel: '排一排',
      solution: [
        { tag: '想一想', text: '三句话里「是第几名」最确定，先用它；再用「不是」和「谁比谁快」一格一格排除。' },
        { tag: '推一推', text: steps.join('') },
        { tag: '验一验', text: '对照名次表把三句话再读一遍，全都符合 ✓' },
        { tag: '答', text: '第 ' + askRank + ' 名是' + answer + '。' }
      ],
      key: 'race:' + names.join(',') + ':' + pf + '@' + rf + '|' + nb + '!1|' + cmp.t + '>' + cmp.s + ':' + askRank
    }
  }

  var PAIXU = {
    id: 'paixu',
    no: '39',
    stage: 'L2',
    name: '排序推理',
    lesson: {
      title: '排序推理 · 方法讲解',
      sections: [
        {
          heading: '这是什么问题？',
          paras: ['几句话告诉你「谁比谁高」「谁不是第一」，不用算，靠推理把大家的顺序排出来。']
        },
        {
          heading: '怎么想？',
          paras: [
            '把每句话读成「谁在前、谁在后」。先找那个谁都压不过的人——没有一句话说他输，他就是第一。',
            '把第一名拿走，在剩下的人里再找「没人压得过」的，就是第二……一个一个排下去。'
          ]
        },
        {
          heading: '例题示范',
          example: {
            stem: '小明、小红、小华比身高。小明比小红高，小华比小明高。三人中谁最高？',
            solution: [
              { tag: '想一想', text: '把两句话读成「谁在前、谁在后」，再拼起来。' },
              { tag: '推一推', text: '小华比小明高，小明又比小红高——串成一串：小华 → 小明 → 小红。' },
              { tag: '验一验', text: '小明比小红高 ✓，小华比小明高 ✓，两句话都符合。' },
              { tag: '答', text: '最高的是小华。' }
            ]
          }
        },
        { heading: '记住口诀', chant: '一句一句读，前后排排队；谁都压不过，那就是第一。' }
      ]
    },
    variants: [
      { id: 'tall', setting: 'vPxTall', label: '三人两句话，找最高', gen: genTall },
      { id: 'order', setting: 'vPxOrder', label: '四人三句话，排顺序', gen: genOrder },
      { id: 'race', setting: 'vPxRace', label: '赛跑名次（含「不是」条件）', def: false, gen: genRace }
    ],
    generate: function (s) {
      return U.generateFrom(PAIXU.variants, s)
    },
    titleFor: function () {
      return '排序推理练习'
    }
  }

  root.SumSum.aoshu.topics.paixu = PAIXU
  root.SumSum.aoshu.topicList.push(PAIXU)
})(typeof window !== 'undefined' ? window : globalThis)
