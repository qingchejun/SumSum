/**
 * 知识点「14 空瓶换水」：换来的汽水喝完，瓶子又变成空瓶还能接着换。
 * 答案一律由逐轮模拟算出，解析文案与模拟数字逐轮一致（这是本知识点的正确性关键）。
 * 变式：①有 k 个空瓶最多喝几瓶 ②买 m 瓶最多一共喝几瓶。
 */
(function (root) {
  'use strict'

  var U = root.SumSum.aoshu.util

  /*
   * 逐轮模拟：b 个空瓶、每 n 个换 1 瓶。
   * 每轮：换 t = ⌊b/n⌋ 瓶 → 剩 left = b − t×n 个旧空瓶 + 喝完的 t 个新空瓶。
   */
  function simulate(k, n) {
    var rounds = []
    var b = k
    var drunk = 0
    while (b >= n) {
      var t = Math.floor(b / n)
      var left = b - t * n
      rounds.push({ start: b, t: t, left: left, after: left + t })
      drunk += t
      b = left + t
    }
    return { drunk: drunk, rounds: rounds, finalLeft: b }
  }

  /* 每一轮的解析步骤（tag「第 X 轮」） */
  function roundSteps(rounds, n) {
    return rounds.map(function (r, i) {
      return {
        tag: '第 ' + (i + 1) + ' 轮',
        text:
          r.start + ' 个空瓶，每 ' + n + ' 个换 1 瓶，能换 ' + r.t + ' 瓶；喝完后手里的空瓶 = 剩下的 ' +
          r.left + ' 个 + 新的 ' + r.t + ' 个 = ' + r.after + ' 个。'
      }
    })
  }

  /* 「一共喝」的连加文案 */
  function sumText(rounds, extra) {
    var parts = rounds.map(function (r) {
      return String(r.t)
    })
    if (extra) parts.unshift(String(extra))
    var total = parts.reduce(function (acc, x) {
      return acc + Number(x)
    }, 0)
    return parts.length > 1 ? parts.join(' + ') + ' = ' + total : String(total)
  }

  /* 各难度档：兑换比 n 与空瓶/购买数量范围 */
  function params(s) {
    if (s.difficulty === 'L3') return { n: U.pick([3, 4]), kMin: 6, kMax: 25, mMin: 4, mMax: 20 }
    if (s.difficulty === 'L2') return { n: U.pick([2, 3]), kMin: 4, kMax: 15, mMin: 3, mMax: 12 }
    return { n: 2, kMin: 3, kMax: 9, mMin: 2, mMax: 8 }
  }

  /* 变式①：有 k 个空瓶，最多喝几瓶 */
  function genDrink(s) {
    var p = params(s)
    var k = U.randInt(p.kMin, p.kMax)
    if (k < p.n) return null
    var sim = simulate(k, p.n)
    if (sim.rounds.length < 1 || sim.rounds.length > 4) return null
    var name = U.pick(U.NAMES)
    return {
      topic: 'kongping',
      variant: 'drink',
      stem:
        p.n + ' 个空瓶可以换 1 瓶汽水。' + name + '有 ' + k + ' 个空瓶，最多能喝到几瓶汽水？',
      answer: sim.drunk,
      unit: '瓶',
      ansLabel: '答：最多能喝到',
      ansSuffix: ' 瓶汽水。',
      solution: [
        { tag: '想一想', text: '换来的汽水喝完，瓶子又变成空瓶，还能接着换——一轮一轮算，别漏了新空瓶！' }
      ]
        .concat(roundSteps(sim.rounds, p.n))
        .concat([
          { tag: '验一验', text: '最后剩 ' + sim.finalLeft + ' 个空瓶，不够 ' + p.n + ' 个，换不了了。一共喝：' + sumText(sim.rounds) + '（瓶）✓' },
          { tag: '答', text: '最多能喝到 ' + sim.drunk + ' 瓶汽水。' }
        ]),
      key: 'drink:' + p.n + ',' + k
    }
  }

  /* 变式②：买 m 瓶，连喝带换一共喝几瓶 */
  function genBuy(s) {
    var p = params(s)
    var m = U.randInt(p.mMin, p.mMax)
    if (m < p.n) return null
    var sim = simulate(m, p.n)
    if (sim.rounds.length < 1 || sim.rounds.length > 4) return null
    var total = m + sim.drunk
    var name = U.pick(U.NAMES)
    return {
      topic: 'kongping',
      variant: 'buy',
      stem:
        name + '买了 ' + m + ' 瓶汽水。喝完的空瓶每 ' + p.n + ' 个可以换 1 瓶汽水，' +
        name + '最多一共能喝到几瓶汽水？',
      answer: total,
      unit: '瓶',
      ansLabel: '答：最多一共能喝到',
      ansSuffix: ' 瓶汽水。',
      solution: [
        { tag: '想一想', text: '先把买的 ' + m + ' 瓶喝掉，手里就有 ' + m + ' 个空瓶，再一轮一轮去换。' }
      ]
        .concat(roundSteps(sim.rounds, p.n))
        .concat([
          { tag: '验一验', text: '最后剩 ' + sim.finalLeft + ' 个空瓶，不够换了。买的 ' + m + ' 瓶 + 换来的 ' + sumText(sim.rounds) + ' 瓶，一共 ' + total + ' 瓶 ✓' },
          { tag: '答', text: '最多一共能喝到 ' + total + ' 瓶汽水。' }
        ]),
      key: 'buy:' + p.n + ',' + m
    }
  }

  var KONGPING = {
    id: 'kongping',
    no: '14',
    stage: 'L1',
    name: '空瓶换水',
    lesson: {
      title: '空瓶换水 · 方法讲解',
      sections: [
        {
          heading: '这是什么问题？',
          paras: ['「几个空瓶换一瓶汽水」是最经典的趣味题。最容易错的地方：换来的汽水喝完，瓶子又变成空瓶，还能接着换——很多人只换一轮就停了！']
        },
        {
          heading: '怎么想？',
          paras: ['一轮一轮老老实实地数：每轮先算「能换几瓶」，再数清手里的空瓶（没换掉的旧瓶 + 刚喝完的新瓶），直到不够换为止。']
        },
        {
          heading: '例题示范',
          example: {
            stem: '2 个空瓶可以换 1 瓶汽水。小明有 5 个空瓶，最多能喝到几瓶汽水？',
            solution: [
              { tag: '想一想', text: '换来的汽水喝完，瓶子又变成空瓶，还能接着换！' },
              { tag: '第 1 轮', text: '5 个空瓶，每 2 个换 1 瓶，能换 2 瓶；喝完后手里的空瓶 = 剩下的 1 个 + 新的 2 个 = 3 个。' },
              { tag: '第 2 轮', text: '3 个空瓶能换 1 瓶；喝完后 = 剩下的 1 个 + 新的 1 个 = 2 个。' },
              { tag: '第 3 轮', text: '2 个空瓶再换 1 瓶；喝完后只剩 1 个空瓶，不够换了。' },
              { tag: '验一验', text: '一共喝：2 + 1 + 1 = 4（瓶）✓' },
              { tag: '答', text: '最多能喝到 4 瓶汽水。' }
            ]
          }
        },
        { heading: '记住口诀', chant: '喝完瓶子别扔掉，凑够就去换一瓶；一轮一轮慢慢数，直到不够换为止。' }
      ]
    },
    variants: [
      { id: 'drink', setting: 'vKpDrink', label: '有 k 个空瓶，最多喝几瓶', gen: genDrink },
      { id: 'buy', setting: 'vKpBuy', label: '买 m 瓶，连喝带换共几瓶', gen: genBuy }
    ],
    generate: function (s) {
      return U.generateFrom(KONGPING.variants, s)
    },
    titleFor: function (s) {
      return '空瓶换水练习 · ' + U.DIFF_LABEL[s.difficulty]
    }
  }

  root.SumSum.aoshu.topics.kongping = KONGPING
  root.SumSum.aoshu.topicList.push(KONGPING)
})(typeof window !== 'undefined' ? window : globalThis)
