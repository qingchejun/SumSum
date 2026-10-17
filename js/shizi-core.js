/**
 * 识字板块的核心：把一整张字表按「第几周」切出该印的那一批字。
 *
 * 这个板块没有随机、没有生成算法 —— 字表是固定的、顺序是洪恩排好的、
 * 复习就是照着顺序一周一批走过去，所以这里全是纯粹的下标计算。
 * 正因为简单，反而容易在边界上出错（最后一周、越界的周次、每周字数被改过之后
 * 原来的周次还指向哪里），边界都在 sliceOf / clampWeek 里收口。
 *
 * 无 DOM 依赖，node 里可直接 require（tools/check-shizi.js 靠这一点）。
 */
(function (root) {
  'use strict'

  /*
   * 纳入复习的字数。字表原始有 1620 字（9 屏 × 180），孩子在洪恩上学到第 1595 字，
   * 取整到 1600 —— 正好 16 周 × 100 字，不用处理「最后一周只有 95 个字、
   * 格子要不要跟着变大」这种一次性的碎问题。
   * 将来想把剩下的 20 字也纳进来，改这一个数即可（周次会自动变成 17 周）。
   */
  var TOTAL = 1600

  function list() {
    return root.SumSum.shiziData.LIST
  }

  /* 实际参与复习的字表（前 TOTAL 个）。字表比 TOTAL 短时以字表为准，不会越界。 */
  function pool() {
    return list().slice(0, Math.min(TOTAL, list().length))
  }

  function poolSize() {
    return Math.min(TOTAL, list().length)
  }

  /* 每周 perWeek 个字，一共要走几周。末周不满也算一周。 */
  function totalWeeks(perWeek) {
    var n = Math.max(1, perWeek | 0)
    return Math.max(1, Math.ceil(poolSize() / n))
  }

  function clampWeek(week, perWeek) {
    var w = Math.round(Number(week) || 1)
    return Math.min(totalWeeks(perWeek), Math.max(1, w))
  }

  /*
   * 第 week 周该印哪些字。
   * from / to 是给人看的序号（1 起算，闭区间），chars 是字符数组。
   * 末周不满时 chars.length < perWeek —— 渲染层要按 chars.length 排版，
   * 不能按 perWeek 排，否则末页会多出一片空格子。
   */
  function sliceOf(week, perWeek) {
    var n = Math.max(1, perWeek | 0)
    var w = clampWeek(week, n)
    var start = (w - 1) * n
    var chars = pool().slice(start, start + n)
    return {
      week: w,
      weeks: totalWeeks(n),
      from: start + 1,
      to: start + chars.length,
      chars: chars
    }
  }

  /*
   * 换每周字数时，周次怎么跟着搬。
   *
   * week 存的是序数不是字序，所以光改 perWeek 会让同一个 week 指向完全不同的字：
   * 第 16 周在「每周 100 字」下是第 1501–1600 字，在「每周 50 字」下却成了第 751–800 字，
   * 复习进度凭空倒退 750 个字。正确做法是【停在同一个字上】：取当前这周的起始字序，
   * 算出在新的每周字数下，包含这个字的是第几周。
   *
   * 放在 core 而不是 main，与数独的 remapClues 一样 —— 一来这是纯计算，
   * 二来放 main 里 tools/check-shizi.js 就够不着了（main 依赖 DOM）。
   */
  function remapWeek(week, fromPerWeek, toPerWeek) {
    var to = Math.max(1, toPerWeek | 0)
    var from = sliceOf(week, fromPerWeek).from // 当前这周的起始字序，1 起算
    return clampWeek(Math.floor((from - 1) / to) + 1, to)
  }

  /*
   * 把一批字按【字表顺序】排好，顺带去重。
   *
   * 错字集是家长一个一个点出来的，顺序是点击的先后，印成卷子会显得杂乱。
   * 按字表下标排之后，同一课、同一屏的字自然聚在一起，孩子读起来是有上下文的。
   * 字表里没有的字（理论上不会有，但别让它凭空消失）排到最后，保持原相对顺序。
   *
   * 纯函数放在 core 而不是 shizi-mark，是为了 tools/check-shizi.js 够得着 ——
   * mark 那一层依赖 DOM 和 localStorage，node 里跑不了。与 remapWeek 同一个理由。
   */
  function sortByTable(chars) {
    if (!chars || !chars.length) return []
    var all = list()
    var rank = {}
    for (var i = 0; i < all.length; i++) {
      /* 同一个字在表里只应出现一次；万一重复，以第一次出现的位置为准 */
      if (rank[all[i]] == null) rank[all[i]] = i
    }
    var seen = {}
    var out = []
    chars.forEach(function (ch) {
      if (seen[ch]) return
      seen[ch] = true
      out.push(ch)
    })
    return out
      .map(function (ch, i) {
        /* 表外的字给一个比表长还大的名次，并用录入顺序 i 做次级键，排在最后且保持原序 */
        return { ch: ch, r: rank[ch] == null ? all.length + i : rank[ch] }
      })
      .sort(function (a, b) {
        return a.r - b.r
      })
      .map(function (e) {
        return e.ch
      })
  }

  /*
   * 从错字集里挑一批，附在本周复习卷后面。
   *
   *   pool     错字集里全部的字（顺序无所谓）
   *   exclude  本周卷上已经印了的字。同一沓纸里同一个字印两遍是浪费 ——
   *            孩子刚念完一遍，翻一页又是它，附页的格子该留给早几周的旧账。
   *   max      最多挑几个。少于这个数就全给，这是调用方定的策略，这里只执行。
   *   rnd      取随机数的函数，默认 Math.random。注入是为了 tools/check-shizi.js
   *            能喂一串定死的数，把「挑出来的是不是真的均匀」算清楚。
   *   weight   每个字的抽中权重（见 reviewWeight），不给就人人一样。权重 0 的不抽。
   *            错得越多的字越容易被抽到，但不是「只抽错得最多的」—— 那样附页每周都是
   *            同一批字，错一两次的永远轮不上。
   *
   * 【挑是随机的，印出来是有序的】：返回值过一遍 sortByTable。
   * 理由同错字卷 —— 同一课的字聚在一起，孩子读的时候是有上下文的；
   * 而且卷面顺序固定，家长核对起来不用来回找。
   */
  function sampleWrong(pool, exclude, max, rnd, weight) {
    if (!pool || !pool.length || !(max > 0)) return []
    var skip = {}
    ;(exclude || []).forEach(function (ch) {
      skip[ch] = true
    })
    var cand = []
    var seen = {}
    var w = weight || function () {
      return 1
    }
    pool.forEach(function (ch) {
      if (!ch || skip[ch] || seen[ch] || !(w(ch) > 0)) return
      seen[ch] = true
      cand.push(ch)
    })
    if (cand.length <= max) return sortByTable(cand)
    /* 带权不放回抽样（Efraimidis–Spirakis）：每个字抽一个 -ln(u)/权重，取最小的 max 个。
       权重全一样时就是等概率抽 max 个。 */
    var r = rnd || Math.random
    return sortByTable(cand.map(function (ch) {
      return { ch: ch, k: -Math.log(1 - r()) / w(ch) }
    }).sort(function (a, b) {
      return a.k - b.k
    }).slice(0, max).map(function (e) {
      return e.ch
    }))
  }

  /*
   * 附页抽字的权重：累计错的次数 × 2（红底）或 × 1（半红，上次复习认出来了）。
   * 已经移出的是 0，不抽。错 4 次的红底字（8）被抽中的机会大约是错 1 次的半红字（1）的 8 倍。
   */
  function reviewWeight(e) {
    var st = markState(e)
    if (st === 'out') return 0
    return markCount(e) * (st === 'wrong' ? 2 : 1)
  }

  /*
   * 错字进出错字集的规则：【进来点一下，出去要在两个不同的日子各认出来一次】。
   * 另外每个字记一个【累计次数】n：一共进过几次错字集，移出也不清零，再进来接着加一。
   *
   * 错字集和累计记录是【同一份数据】，不是两个库：每个字一条记录，状态和次数都在里面。
   * 分两处存的话，点一下、撤回一下、清空一下都得两边一起改，迟早对不上。
   *
   * 一条记录 entry 长这样（日期都是本地日期 'YYYY-MM-DD'，字符串直接比大小）：
   *   { add, n }              2：在错字集里，还没认出来过
   *   { add, hit, n }         1：hit 那天认出来过一次
   *   { add, hit, out, n }    out 那天刚移出。当天再点能原样撤回
   *   { n, out }              早就移出了，只留累计次数
   *   { add, n, prev }        移出过又进来的；prev 是上一次移出的日子，只为当天撤回用
   *   null                    从没进过（或者进来当天就撤回了）
   * 缺 n 的老记录（v1 迁移过来的、v2 早期的）一律当作进过 1 次，见 markCount。
   *
   * 点一下怎么走，只看两件事：现在是哪种状态，上一步是不是今天点的。
   *   【今天点的，再点一下就是撤回】；不是今天点的，再点一下才往前走一步。
   * 这样「同一天连点两下」永远凑不成「认出两次」—— 孩子当场念对两遍，和隔天
   * 还记得，是两回事；而手一滑点错了，当场再点一下就回去，次数也跟着退回，不留痕迹。
   *
   * 「两次」要【连续】：认出一次之后，下一次复习没认出来，家长点「复习完了，结算」，
   * 它就退回红底、次数 +1（见下面的 markMiss）。不结算的话系统分不出「没认出」和「没复习」，
   * 只能停在 1 等着。
   *
   * 另外两个只为历史统计记的字段，各种状态之间都跟着走（见 carry）：
   *   first   第一次错的日子（2026-10 以前的老记录没有，用 add 顶）
   *   miss    最近一次结算时没认出的日子；missWas 是结算前的样子，只为当天撤销用
   *
   * 永远返回新对象，不改传进来的 entry。纯函数放 core，理由同 sortByTable。
   */
  function markState(e) {
    if (!e || e.out) return 'out'
    return e.hit ? 'once' : 'wrong'
  }

  function markCount(e) {
    return e ? e.n || 1 : 0
  }

  /* 把只为统计记的字段搬到新记录上；去掉值为 undefined 的键，存起来干净 */
  function carry(e, today, o) {
    if (e && e.first) o.first = e.first
    if (e && e.miss) o.miss = e.miss
    if (e && e.miss === today && e.missWas) o.missWas = e.missWas
    Object.keys(o).forEach(function (k) {
      if (o[k] === undefined) delete o[k]
    })
    return o
  }

  function markStep(e, today) {
    var st = markState(e)
    /* 今天结算时算成「没认出」的，又被点了：是家长漏点了。先撤销结算，再当作今天认出 */
    if (st !== 'out' && e.miss === today && e.missWas) return markStep(markUnmiss(e, today), today)
    var n = markCount(e)
    if (st === 'out') {
      if (!e) return { add: today, n: 1, first: today }
      /* 当天移出（或当天清空）的，原样恢复，不算又进来一次 */
      if (e.out === today) return carry(e, today, { add: e.add, hit: e.hit, n: n })
      return carry(e, today, { add: today, n: n + 1, prev: e.out })
    }
    if (st === 'wrong') {
      if (e.add === today) {
        /* 今天刚进来的：撤回。以前进过的回到「已移出」，次数退回去；第一次进的整条删掉 */
        return e.prev ? carry(e, today, { n: n - 1, out: e.prev }) : null
      }
      return carry(e, today, { add: e.add, hit: today, n: n })
    }
    if (e.hit === today) return carry(e, today, { add: e.add, n: n }) // 今天刚认出的：撤回
    return carry(e, today, { add: e.add, hit: e.hit, out: today, n: n })
  }

  /* 「清空错字集」：在集里的一律当作今天移出，次数不动；已经移出的原样返回 */
  function markClear(e, today) {
    if (markState(e) === 'out') return e
    return carry(e, today, { add: e.add, hit: e.hit, out: today, n: markCount(e) })
  }

  /*
   * 复习结算：这个字在卷面上、在错字集里，今天却没点 —— 又不认识了。
   * 次数 +1；认出过一次的退回红底（移出要连续两次复习都认出）。
   * 今天动过的不算（今天刚收进来的已经记过一次；今天认出、今天移出的是认识的）；
   * 同一天结算两次不重复加。missWas 记下结算前的样子，当天撤销用。
   */
  function markMiss(e, today) {
    if (markState(e) === 'out') return e
    if (e.add === today || e.hit === today || e.miss === today) return e
    var was = {}
    if (e.hit) was.hit = e.hit
    if (e.miss) was.miss = e.miss
    var o = Object.assign({}, e, { n: markCount(e) + 1, miss: today, missWas: was })
    delete o.hit
    delete o.prev // 只在进来当天有用（撤回用），进来不是今天，早就没用了
    return o
  }

  /* 撤销今天的结算：回到结算前的样子。不是今天结算的原样返回 */
  function markUnmiss(e, today) {
    if (!e || e.miss !== today || !e.missWas) return e
    var o = Object.assign({}, e, { n: Math.max(1, markCount(e) - 1) })
    delete o.missWas
    delete o.miss
    delete o.hit
    if (e.missWas.hit) o.hit = e.missWas.hit
    if (e.missWas.miss) o.miss = e.missWas.miss
    return o
  }

  /*
   * 历史错字统计：只要错过一次的字都在里面，移出了的也在（这就是「历史错字集」，
   * 和错字集是同一份记录，见 markStep 的说明）。
   * 按累计次数从多到少分组，同一组里按字表顺序，免得每次打开顺序都在变。
   * 被人手改坏的条目跳过，判断口径同 shizi-mark 的 load。
   */
  function historyStats(marks) {
    var out = { total: 0, inSet: 0, once: 0, out: 0, times: 0, groups: [] }
    if (!marks || typeof marks !== 'object') return out
    var byN = {}
    var info = {}
    Object.keys(marks).forEach(function (ch) {
      var e = marks[ch]
      if (!e || typeof e !== 'object' || (typeof e.add !== 'string' && typeof e.out !== 'string')) return
      var st = markState(e)
      var n = markCount(e)
      out.total++
      out.times += n
      if (st === 'out') out.out++
      else out.inSet++
      if (st === 'once') out.once++
      var add = e.add || ''
      var miss = e.miss || ''
      info[ch] = { ch: ch, n: n, st: st, first: e.first || add, last: miss > add ? miss : add }
      ;(byN[n] = byN[n] || []).push(ch)
    })
    out.groups = Object.keys(byN).map(Number).sort(function (a, b) {
      return b - a
    }).map(function (n) {
      return {
        n: n,
        items: sortByTable(byN[n]).map(function (ch) {
          return info[ch]
        })
      }
    })
    return out
  }

  /*
   * 练习纸标题。用户在面板上填了标题就用他的，这里只管默认的那一行。
   *
   * 标题【必须短】。页眉是 .sheet-title + .sheet-meta 一行排开，两者都是
   * white-space: nowrap（css/sheet.css），换不了行；「日期 姓名 用时 得分」
   * 那一栏就占掉 99mm，标题只剩 73mm 可用（180 - 99 - 8mm 间距）。
   * 一旦超出，页眉不会截断也不会换行 —— 浏览器会把【整张纸】等比缩到能装下为止。
   * 缩完页眉那条横线仍然满宽（它是 width:auto，跟着页框走），所以从横线上
   * 完全看不出来；露馅的是字格：按 mm 写死的尺寸全跟着缩。
   *
   * 原先标题是「识字复习 · 第 1 周（第 1–100 字）」，96.8mm，连同页眉信息栏
   * 合计 204mm，整页被缩到 88%，字从 10.6mm 缩成 9.4mm、字格离右边空出一截。
   * 字序区间页脚里本来就有（「第 1 周 / 共 16 周 · 第 1–100 字」），标题不必再说一遍。
   */
  function titleFor(s) {
    return '识字复习 · 第 ' + clampWeek(s.week, s.perWeek) + ' 周'
  }

  root.SumSum = root.SumSum || {}
  root.SumSum.shizi = {
    TOTAL: TOTAL,
    pool: pool,
    poolSize: poolSize,
    totalWeeks: totalWeeks,
    clampWeek: clampWeek,
    remapWeek: remapWeek,
    sortByTable: sortByTable,
    sampleWrong: sampleWrong,
    reviewWeight: reviewWeight,
    markState: markState,
    markStep: markStep,
    markCount: markCount,
    markClear: markClear,
    markMiss: markMiss,
    markUnmiss: markUnmiss,
    historyStats: historyStats,
    sliceOf: sliceOf,
    titleFor: titleFor
  }
})(typeof window !== 'undefined' ? window : globalThis)
