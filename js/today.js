/**
 * 「今天」首页：把 today-core 算好的四张卡片画出来。
 *
 * 卡片上半部是进入板块的链接，底栏蓝色「打印」是另一个链接（板块页 + #print），
 * 板块页会先把纸渲染出来、在纸上方弹一条「确认打印」，家长看一眼再印 —— 用户定的规矩：
 * 首页不直接弹打印对话框。
 *
 * 文字全部来自固定文案、大纲常量和数字，没有用户输入（口算/数独的自定义标题不在卡片上用），
 * 可以直接拼 HTML。
 */
;(function (root) {
  'use strict'

  var doc = root.document
  var S = root.SumSum

  function storage() {
    try {
      return root.localStorage
    } catch (e) {
      return { getItem: function () { return null } }
    }
  }

  var PLAY_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5l11 7-11 7z"/></svg>'

  function card(o) {
    return '<article class="tcard">' +
      '<a class="tcard-body" href="' + o.href + '">' +
        '<div class="mini ' + o.miniCls + '" aria-hidden="true">' + o.mini + '</div>' +
        '<div class="tcard-main">' +
          '<span class="tag">' + o.tag + '</span>' +
          '<h2>' + o.title + '</h2>' +
          o.lines +
        '</div>' +
      '</a>' +
      '<div class="tcard-foot">' +
        '<a class="btn btn-primary" href="' + o.printHref + '">' + o.printText + '</a>' +
        '<span class="more">' + o.more + '</span>' +
      '</div>' +
    '</article>'
  }

  function bars(n) {
    var out = ''
    for (var i = 0; i < n; i++) out += '<i></i>'
    return out
  }

  function aoshuCard(a) {
    var lines
    if (a.next) {
      lines = '<div class="tcard-row">' +
          (a.video ? '<span class="vid">' + PLAY_SVG + '有讲解视频 ' + a.video.dur + '</span>' : '') +
          '<span class="meta">' + a.parts + '</span></div>'
    } else {
      lines = '<div class="tcard-row"><span class="meta">从学过的课里混合出题，解析页标明每题出自哪一课</span></div>'
    }
    lines += '<div class="tcard-prog"><div class="progress"><i style="width:' + (a.learned / a.total) * 100 + '%"></i></div>' +
      '<span class="meta">已学 ' + a.learned + ' / ' + a.total + '</span></div>'
    return card({
      href: a.href,
      printHref: a.printHref,
      miniCls: 'mini-lines',
      mini: bars(9),
      tag: a.next ? '奥数 · 接着学' : '奥数 · 全部学完',
      title: a.next ? '第 ' + a.next.no + ' 课 · ' + a.next.name : '出一张综合复习卷',
      lines: lines,
      printText: a.next ? '打印本课' : '打印综合复习卷',
      more: '点卡片进入奥数 →'
    })
  }

  function shiziCard(z) {
    var chars = S.shizi.sliceOf(z.week, 100).chars.slice(0, 36).join('')
    var mini = '<div class="mini-zi">' + chars.split('').map(function (c) { return '<span>' + c + '</span>' }).join('') + '</div>'
    var meta = []
    meta.push('错字集 ' + z.wrong + ' 个')
    if (z.repeats) meta.push('其中 ' + z.repeats + ' 个反复错')
    if (z.mode === 'week' && z.withWrong && z.wrong) meta.push('附一页错字')
    var weeks = ''
    for (var i = 1; i <= z.weeks; i++) weeks += '<i' + (i === z.week ? ' class="on"' : i < z.week ? ' class="past"' : '') + '></i>'
    var isWeek = z.mode === 'week'
    return card({
      href: z.href,
      printHref: z.printHref,
      miniCls: 'mini-center',
      mini: mini,
      tag: isWeek ? '识字 · 本周复习' : '识字 · 错字集',
      title: isWeek ? '第 ' + z.week + ' 周 · 第 ' + z.from + '–' + z.to + ' 字' : '错字卷 · ' + z.wrong + ' 个字',
      lines: '<span class="meta">' + meta.join(' · ') + '</span>' +
        '<div class="tcard-prog"><div class="weeks">' + weeks + '</div>' +
        '<span class="meta">第 ' + z.week + ' / ' + z.weeks + ' 周</span></div>',
      printText: isWeek ? '打印本周复习卷' : '打印错字卷',
      more: '点卡片去标记错字 →'
    })
  }

  function kousuanCard(k) {
    return card({
      href: k.href,
      printHref: k.printHref,
      miniCls: 'mini-lines mini-groups',
      mini: bars(4) + '<b></b>' + bars(4) + '<b></b>' + bars(3),
      tag: '口算 · 上次的设置',
      title: k.title,
      lines: '<span class="meta">' + k.meta + '</span><span class="meta tcard-end">每次打印都换一批新题</span>',
      printText: '打印',
      more: '点卡片调整设置 →'
    })
  }

  function shuduCard(d) {
    return card({
      href: d.href,
      printHref: d.printHref,
      miniCls: 'mini-center mini-boards',
      mini: '<i class="board"></i><i class="board"></i>',
      tag: '数独 · 上次的设置',
      title: d.title,
      lines: '<span class="meta">' + d.meta + '</span><span class="meta tcard-end">也可以进去在屏幕上直接玩</span>',
      printText: '打印',
      more: '点卡片进入数独 →'
    })
  }

  var data = S.today.build(storage(), new Date())
  doc.getElementById('today-date').textContent = data.date + ' · 每张卡片都是上次的设置'
  doc.getElementById('today-cards').innerHTML =
    aoshuCard(data.aoshu) + shiziCard(data.shizi) + kousuanCard(data.kousuan) + shuduCard(data.shudu)
})(window)
