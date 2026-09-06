/**
 * 知识点「40 列表推理」：几个人、几样东西一人一样，用「是 / 不是」线索列表排除。
 * 变式：①一条肯定 + 一条否定 ②全否定线索连环排除 ③帽子颜色（他人视角线索，def:false）。
 * 每道题生成时枚举全部 6 种分配方案，验证恰好一种满足所有线索（否则丢弃重出）。
 * key 里带完整线索签名，外部测试可独立重新枚举复核。
 */
(function (root) {
  'use strict'

  var U = root.SumSum.aoshu.util

  /* 物品类别池：each 开场句，is/not 线索谓语 */
  var CATS = [
    { label: '水果', each: '每人拿了一样水果', is: '拿的是', not: '拿的不是', items: ['苹果', '梨', '桃'] },
    { label: '文具', each: '每人买了一样文具', is: '买的是', not: '买的不是', items: ['铅笔', '橡皮', '尺子'] },
    { label: '运动', each: '每人参加一项运动', is: '参加的是', not: '参加的不是', items: ['跳绳', '踢毽', '拍球'] },
    { label: '气球', each: '每人选了一个气球', is: '选的是', not: '选的不是', items: ['红气球', '黄气球', '蓝气球'] }
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

  /*
   * 枚举验证：assigns 是 items 的全排列（第 i 个人拿 perm[i]），
   * clues 形如 { p: 人下标, eq: true/false, item: 物品 }，恰好一种分配满足全部线索才合法。
   */
  function uniqueAssign(names, items, clues) {
    var ok = permutations(items).filter(function (perm) {
      return clues.every(function (c) {
        return c.eq ? perm[c.p] === c.item : perm[c.p] !== c.item
      })
    })
    return ok.length === 1 ? ok[0] : null
  }

  /* 变式①：一条「是」+ 一条「不是」，两步定全部 */
  function genThree(s) {
    var cat = U.pick(CATS)
    var names = pickNames(3)
    var items = cat.items
    var truth = permutations(items)[U.randInt(0, 5)] // truth[i] = 第 i 人拿的
    /* 线索：A 是自己的物品；B 不是 C 的物品（A、B、C 是三个不同的人） */
    var order = permutations([0, 1, 2])[U.randInt(0, 5)]
    var a = order[0]
    var b = order[1]
    var c = order[2]
    var clues = [
      { p: a, eq: true, item: truth[a] },
      { p: b, eq: false, item: truth[c] }
    ]
    var solved = uniqueAssign(names, items, clues)
    if (!solved) return null

    var asked = U.pick([b, c])
    var answer = truth[asked]
    var clueTexts = [
      names[a] + cat.is + truth[a],
      names[b] + cat.not + truth[c]
    ]
    return {
      topic: 'liebiao',
      variant: 'three',
      stem:
        names.join('、') + '三人' + cat.each + '：' + items.join('、') + '，各不相同。' +
        clueTexts.join('；') + '。' + names[asked] + cat.is + '什么？',
      answer: answer,
      unit: '',
      ansLabel: '答：' + names[asked] + cat.is,
      ansSuffix: '。',
      workLabel: '列一列',
      solution: [
        { tag: '想一想', text: '在心里画个小表：行写人，列写' + cat.label + '。「是」打 √，「不是」打 ✗；一行有了 √，别人那格全是 ✗。' },
        {
          tag: '列一列',
          text:
            '第 1 步 ' + names[a] + cat.is + truth[a] + '（√），那么' + names[b] + '、' + names[c] +
            '都不是' + truth[a] + '；第 2 步 ' + names[b] + cat.not + truth[c] + '，也不是' + truth[a] +
            '，三样里只剩' + truth[b] + '——就是它；第 3 步 剩下的' + truth[c] + '是' + names[c] + '的。'
        },
        { tag: '验一验', text: '两条线索再核对：' + clueTexts.join(' ✓；') + ' ✓' },
        { tag: '答', text: names[asked] + cat.is + answer + '。' }
      ],
      key:
        'three:' + items.join('/') + ':' + names.join(',') + ':' +
        names[a] + '=' + truth[a] + '|' + names[b] + '≠' + truth[c] + ':' + names[asked]
    }
  }

  /* 变式②：三条全是「不是」，连环排除 */
  function genNeg(s) {
    var cat = U.pick(CATS)
    var names = pickNames(3)
    var items = cat.items
    var truth = permutations(items)[U.randInt(0, 5)]
    var order = permutations([0, 1, 2])[U.randInt(0, 5)]
    var a = order[0]
    var b = order[1]
    var c = order[2]
    /* A 的两条否定（排除掉另外两样）→ A 确定；B 不是 C 的那样 → B 确定 */
    var clues = [
      { p: a, eq: false, item: truth[b] },
      { p: a, eq: false, item: truth[c] },
      { p: b, eq: false, item: truth[c] }
    ]
    var solved = uniqueAssign(names, items, clues)
    if (!solved) return null

    var asked = U.pick([a, b, c])
    var answer = truth[asked]
    var clueTexts = [
      names[a] + cat.not + truth[b],
      names[a] + cat.not + truth[c],
      names[b] + cat.not + truth[c]
    ]
    return {
      topic: 'liebiao',
      variant: 'neg',
      stem:
        names.join('、') + '三人' + cat.each + '：' + items.join('、') + '，各不相同。' +
        clueTexts.join('；') + '。' + names[asked] + cat.is + '什么？',
      answer: answer,
      unit: '',
      ansLabel: '答：' + names[asked] + cat.is,
      ansSuffix: '。',
      workLabel: '列一列',
      solution: [
        { tag: '想一想', text: '全是「不是」也不怕——画表打 ✗：一行攒满两个 ✗，剩下那格就是 √。' },
        {
          tag: '列一列',
          text:
            '第 1 步 ' + names[a] + '不是' + truth[b] + '、也不是' + truth[c] + '，两个 ✗ 攒满，' +
            names[a] + '只能是' + truth[a] + '；第 2 步 ' + names[b] + '不是' + truth[c] + '，' +
            truth[a] + '又被' + names[a] + '拿走了，所以' + names[b] + '是' + truth[b] +
            '；第 3 步 剩下的' + truth[c] + '归' + names[c] + '。'
        },
        { tag: '验一验', text: '三条线索再核对：' + clueTexts.join(' ✓；') + ' ✓' },
        { tag: '答', text: names[asked] + cat.is + answer + '。' }
      ],
      key:
        'neg:' + items.join('/') + ':' + names.join(',') + ':' +
        names[a] + '≠' + truth[b] + '|' + names[a] + '≠' + truth[c] + '|' + names[b] + '≠' + truth[c] + ':' + names[asked]
    }
  }

  /* 变式③帽子颜色：他人视角线索（def:false） */
  function genHat(s) {
    var names = pickNames(3)
    var colors = ['红色', '黄色', '蓝色']
    /* 固定逻辑结构：A 看到的都不是红 → A 是红；B 不是黄 → B 是蓝；C 是黄 */
    var a = U.randInt(0, 2)
    var rest = [0, 1, 2].filter(function (i) {
      return i !== a
    })
    var b = rest[U.randInt(0, 1)]
    var c = rest[0] === b ? rest[1] : rest[0]
    var truth = []
    truth[a] = '红色'
    truth[b] = '蓝色'
    truth[c] = '黄色'
    /* 枚举验证：线索①两人不是红；线索② B 不是黄 */
    var ok = permutations(colors).filter(function (perm) {
      return perm[b] !== '红色' && perm[c] !== '红色' && perm[b] !== '黄色'
    })
    if (ok.length !== 1) return null

    var asked = U.randInt(0, 2)
    var answer = truth[asked]
    return {
      topic: 'liebiao',
      variant: 'hat',
      stem:
        names.join('、') + '三人各戴一顶帽子：红色、黄色、蓝色，各不相同。' + names[a] +
        '说：「我看到的两顶帽子都不是红色。」' + names[b] + '说：「我的帽子不是黄色。」' +
        names[asked] + '戴的是什么颜色的帽子？',
      answer: answer,
      unit: '',
      ansLabel: '答：' + names[asked] + '戴的是',
      ansSuffix: '的帽子。',
      workLabel: '列一列',
      solution: [
        { tag: '想一想', text: names[a] + '看到的是别人头上的帽子，不是自己的——这句话说的是' + names[b] + '和' + names[c] + '。' },
        {
          tag: '推一推',
          text:
            '第 1 步 ' + names[b] + '、' + names[c] + '都不是红色，红帽子只能在' + names[a] +
            '自己头上；第 2 步 ' + names[b] + '不是黄色、也不是红色，只能是蓝色；第 3 步 剩下的黄帽子是' +
            names[c] + '的。'
        },
        {
          tag: '验一验',
          text:
            names[a] + '往外看，看到的是蓝色和黄色，果然都不是红色 ✓；' + names[b] +
            '的是蓝色，不是黄色 ✓'
        },
        { tag: '答', text: names[asked] + '戴的是' + answer + '的帽子。' }
      ],
      key: 'hat:' + names[a] + ',' + names[b] + ',' + names[c] + ':' + names[asked]
    }
  }

  var LIEBIAO = {
    id: 'liebiao',
    no: '40',
    stage: 'L2',
    name: '列表推理',
    lesson: {
      title: '列表推理 · 方法讲解',
      sections: [
        {
          heading: '这是什么问题？',
          paras: ['几个人、几样东西，一人一样。线索只告诉你「谁是什么」「谁不是什么」，要把每个人的东西都找出来。']
        },
        {
          heading: '怎么想？',
          paras: [
            '画一张表：行写人，列写东西。确定「是」就打 √，并把同一行、同一列的其他格子都打 ✗；线索说「不是」的也打 ✗。',
            '哪一行攒够两个 ✗，剩下的那格就是 √——一格一格填，答案自己冒出来。'
          ]
        },
        {
          heading: '例题示范',
          example: {
            stem: '小明、小红、小华每人拿了一样水果：苹果、梨、桃，各不相同。小明拿的是桃；小红拿的不是苹果。小红拿的是什么？',
            solution: [
              { tag: '想一想', text: '画表：行写三个人，列写三样水果。' },
              { tag: '列一列', text: '第 1 步 小明拿的是桃（√），小红、小华都不是桃；第 2 步 小红不是苹果、也不是桃，只剩梨——就是它；第 3 步 剩下的苹果是小华的。' },
              { tag: '验一验', text: '小明是桃 ✓；小红不是苹果 ✓，两条线索都对得上。' },
              { tag: '答', text: '小红拿的是梨。' }
            ]
          }
        },
        { heading: '记住口诀', chant: '是的打个勾，不是打个叉；两叉定一勾，一格不会差。' }
      ]
    },
    variants: [
      { id: 'three', setting: 'vLbThree', label: '一条「是」+ 一条「不是」', gen: genThree },
      { id: 'neg', setting: 'vLbNeg', label: '全是「不是」，连环排除', gen: genNeg },
      { id: 'hat', setting: 'vLbHat', label: '猜帽子颜色（看别人想自己）', def: false, gen: genHat }
    ],
    generate: function (s) {
      return U.generateFrom(LIEBIAO.variants, s)
    },
    titleFor: function () {
      return '列表推理练习'
    }
  }

  root.SumSum.aoshu.topics.liebiao = LIEBIAO
  root.SumSum.aoshu.topicList.push(LIEBIAO)
})(typeof window !== 'undefined' ? window : globalThis)
