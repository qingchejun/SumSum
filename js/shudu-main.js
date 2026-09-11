/**
 * 数独页交互：表单 ↔ 设置对象双向同步、重新生成 / 打印。
 * 与口算/奥数一致——任何参数变化都会自动重新生成并渲染（所见即所得），
 * 没有单独的「生成」按钮。最坏情况（六宫格挑战档 20 题）实测生成只要 8ms，
 * 实时重出题完全跟得上。
 */
(function (root) {
  'use strict'

  var doc = root.document
  var S = root.SumSum

  function $(id) {
    return doc.getElementById(id)
  }

  var els = {
    shape: $('f-shape'),
    clues: $('f-clues'),
    count: $('f-count'),
    copies: $('f-copies'),
    perPage: $('f-perpage'),
    play: $('f-play'),
    nodup: $('f-nodup'),
    anspage: $('f-anspage'),
    title: $('f-title')
  }

  var settings = S.shuduSettings.load()

  /*
   * 难度滑块的范围随盘型变（四宫格 5~12、六宫格 13~26），所以每次渲染表单
   * 都要重设 min/max。下限是实测 100% 挖得到的值，保证滑块上写几个、
   * 卷子上就是几个 —— 见 shudu-core 的 CLUE_RANGE 注释。
   */
  function fillClueSlider(s) {
    var r = S.shudu.clueRange(s.shape)
    var n = S.shudu.shapeOf(s.shape).n
    els.clues.min = String(r.min)
    els.clues.max = String(r.max)
    els.clues.value = String(s.clues)
    $('clues-label').textContent = '给 ' + s.clues + ' 个提示（要填 ' + (n * n - s.clues) + ' 个空）'
    $('clues-min').textContent = r.min + ' 个 · 最难'
    $('clues-max').textContent = '最容易 · ' + r.max + ' 个'
  }

  function fillForm(s) {
    els.shape.value = s.shape
    fillClueSlider(s)
    els.count.value = s.count
    els.copies.value = String(s.copies)
    els.perPage.value = String(s.perPage)
    els.play.checked = s.playMode
    els.nodup.checked = s.noDuplicates
    els.anspage.checked = s.answerPage
    els.title.value = s.title
  }

  function readForm() {
    return S.shuduSettings.sanitize({
      shape: els.shape.value,
      clues: els.clues.value,
      count: els.count.value,
      copies: els.copies.value,
      perPage: els.perPage.value,
      playMode: els.play.checked,
      noDuplicates: els.nodup.checked,
      answerPage: els.anspage.checked,
      seed: settings.seed, // 种子不是表单项，改参数时沿用，只有「重新生成」才换
      title: els.title.value.trim()
    })
  }

  function shapeHint(s) {
    if (s.shape === 's4') {
      return '四宫格是真正意义上最小的标准数独，行、列、2×2 小宫三条规则齐全，一年级 1~3 分钟一题。'
    }
    if (s.shape === 's6') {
      return '六宫格的小宫是 2 行 × 3 列（横着的长方形），比四宫格明显难，一题要 5~15 分钟。'
    }
    return '九宫格就是最常见的那种数独。虽然盘大，但这里出的题同样保证不用猜——' +
      '而且大盘反而更好找突破口：每格有 20 个邻居，凑齐 8 个不同数字它就只剩一个答案了。'
  }

  /*
   * 提前把「会印几张纸、格子有多大」告诉用户：对战双份很容易不知不觉印一叠，
   * 而每页塞几道题直接决定格子大小 —— 这两件事光看预览的缩略图是看不准的，
   * 所以把毫米数直接写出来（一年级的田字格是 12~15mm，家长有参照）。
   */
  function pagesHint(s, count) {
    var per = S.shuduRender.perPageOf(s, count)
    var lay = S.shuduRender.layout(s.shape, per)
    var sheets = Math.ceil(count / per)
    var pages = sheets * s.copies
    var ansPages = s.answerPage ? Math.ceil(count / 6) : 0
    var text = '一共 ' + (pages + ansPages) + ' 张纸：' + count + ' 道题'
    if (per > 1) text += ' · 每页 ' + per + ' 道'
    text += ' = ' + sheets + ' 页'
    if (s.copies > 1) text += ' × 2 份 = ' + pages + ' 张'
    if (ansPages) text += '，另加 ' + ansPages + ' 张答案页'
    return text + '。每格 ' + (Math.floor(lay.cell * 10) / 10) + 'mm。'
  }

  /* 主流程：保存设置 → 同步表单 → 生成题目 → 渲染 → 接管在线作答 */
  function refresh() {
    S.shuduSettings.save(settings)
    fillForm(settings)

    var result = S.shudu.generate(settings)
    S.shuduRender.render($('preview'), settings, result.puzzles)
    S.shuduPlay.attach($('preview'), settings, result.puzzles)
    fitPreview()

    $('shape-hint').textContent = shapeHint(settings)
    $('pages-hint').textContent = pagesHint(settings, result.puzzles.length)

    var notice = $('notice')
    if (result.shortfall > 0) {
      /*
       * 目前只有三宫格挑战档（3 个提示）可能撞上：题面总数有限，
       * 开着「题目不重复」要很多题时会凑不齐。
       */
      notice.textContent =
        '当前设置下不重复的题目只有 ' + result.puzzles.length +
        ' 道（少于设定的 ' + settings.count +
        ' 道）。可以减少题量、换个更大的盘型，或关闭「题目不重复」。'
      notice.hidden = false
    } else {
      notice.hidden = true
    }
  }

  /* 窄屏时按容器宽度整体缩放预览（打印样式里会强制还原成 1:1） */
  function fitPreview() {
    var wrap = $('preview-wrap')
    var sheet = doc.querySelector('.sheet')
    var preview = $('preview')
    if (!sheet || !preview) return
    var factor = Math.min(1, (wrap.clientWidth - 8) / sheet.offsetWidth)
    preview.style.zoom = factor < 1 ? String(factor) : ''
  }

  function onFormChange() {
    settings = readForm()
    refresh()
  }

  /* shape 单独绑（见下），不要进这个循环，否则换盘型会连着渲染两遍 */
  Object.keys(els).forEach(function (k) {
    if (k === 'shape') return
    els[k].addEventListener('change', onFormChange)
  })

  /*
   * 滑块拖动时先只更新文字，松手（change）才真的重新出题。
   * 否则从 5 拖到 12 会一路生成七八批题、预览疯狂闪。
   */
  els.clues.addEventListener('input', function () {
    var n = S.shudu.shapeOf(els.shape.value).n
    var v = Number(els.clues.value)
    $('clues-label').textContent = '给 ' + v + ' 个提示（要填 ' + (n * n - v) + ' 个空）'
  })

  /*
   * 换盘型时提示数要等比搬过去（见 shudu-core 的 remapClues），
   * 而且换盘型等于换一整批题，顺手换个种子更符合直觉。
   */
  els.shape.addEventListener('change', function () {
    var to = els.shape.value
    settings = S.shuduSettings.sanitize(
      Object.assign({}, settings, {
        shape: to,
        clues: S.shudu.remapClues(settings.clues, settings.shape, to),
        seed: S.shuduSettings.newSeed()
      })
    )
    refresh()
  })

  /* 重新生成：参数不变，换一批随机题——换种子即可（种子已写进网址，可复现） */
  $('btn-regen').addEventListener('click', function () {
    settings = Object.assign({}, settings, { seed: S.shuduSettings.newSeed() })
    refresh()
  })

  $('btn-print').addEventListener('click', function () {
    root.print()
  })

  root.addEventListener('resize', fitPreview)

  /* 页面隔天未刷新直接打印（含浏览器菜单打印）时，日期仍保证是当天 */
  root.addEventListener('beforeprint', S.render.refreshDates)

  S.shuduPlay.bind()
  refresh()
})(window)
