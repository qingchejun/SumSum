/**
 * 四个板块页共用的屏幕外壳：分段按钮、数量步进器、顶栏摘要、纸张缩放、从「今天」来的确认打印。
 *
 * 只管屏幕，不碰卷面；必须在各板块的 *-main.js 之前加载（确认打印要在 main 改写网址之前读到 #print）。
 *
 * 【分段按钮不是新控件】select[data-seg] 照旧是数据源：main.js 读写的还是 select.value，
 * 这里只是在它旁边画一排按钮、把 select 藏起来。点按钮 = 改 select.value + 派发 change，
 * 所以各板块的表单逻辑一行不用动。反过来 main.js 用代码改 select.value 不会触发事件，
 * 所以 main 每次 refresh 末尾要调一次 sync()，让按钮的高亮跟上。步进器同理。
 */
;(function (root) {
  'use strict'

  var doc = root.document

  /* 必须在 main.js 跑 save() 之前读：save() 用 replaceState 改写网址时会把 #print 丢掉 */
  var wantPrint = root.location.hash === '#print'

  function fire(el) {
    el.dispatchEvent(new Event('change', { bubbles: true }))
  }

  /* ---------- 分段按钮 ---------- */

  function buildSeg(select) {
    var box = doc.createElement('div')
    box.className = 'seg-ctl'
    box.setAttribute('role', 'group')
    Array.prototype.forEach.call(select.options, function (opt) {
      var b = doc.createElement('button')
      b.type = 'button'
      b.dataset.v = opt.value
      b.textContent = opt.getAttribute('data-short') || opt.textContent
      b.addEventListener('click', function () {
        if (select.value === opt.value) return
        select.value = opt.value
        fire(select)
        sync()
      })
      box.appendChild(b)
    })
    select.hidden = true
    select.insertAdjacentElement('afterend', box)
    select._seg = box
  }

  /* ---------- 数量步进器 ---------- */

  function buildStepper(input) {
    var wrap = doc.createElement('span')
    wrap.className = 'stepper'
    input.insertAdjacentElement('beforebegin', wrap)

    function btn(text, label, delta) {
      var b = doc.createElement('button')
      b.type = 'button'
      b.className = 'btn'
      b.textContent = text
      b.setAttribute('aria-label', label)
      b.addEventListener('click', function () {
        var step = Number(input.step) || 1
        var min = input.min === '' ? -Infinity : Number(input.min)
        var max = input.max === '' ? Infinity : Number(input.max)
        var v = Math.min(max, Math.max(min, (Number(input.value) || 0) + delta * step))
        if (String(v) === input.value) return
        input.value = String(v)
        fire(input)
      })
      return b
    }

    wrap.appendChild(btn('−', '减少', -1))
    wrap.appendChild(input)
    wrap.appendChild(btn('＋', '增加', 1))
  }

  /* 让分段按钮的高亮跟上 select 的当前值（main 用代码改值时不会有事件） */
  function sync() {
    Array.prototype.forEach.call(doc.querySelectorAll('select[data-seg]'), function (s) {
      if (!s._seg) return
      Array.prototype.forEach.call(s._seg.children, function (b) {
        b.classList.toggle('on', b.dataset.v === s.value)
      })
    })
  }

  /* ---------- 顶栏摘要 ---------- */

  /* parts 是这张卷子的几个要点；页数直接数纸，和打印出来的张数是同一个来源 */
  function summary(parts) {
    var el = doc.getElementById('work-sum')
    if (!el) return
    var pages = doc.querySelectorAll('#preview .sheet').length
    var list = parts.filter(Boolean)
    if (pages) list.push('共 ' + pages + ' 页')
    el.textContent = list.join(' · ')
    sync()
  }

  /* ---------- 纸张缩放 ---------- */

  /*
   * 纸张区放不下一整张 A4 时整体缩小（zoom 影响布局尺寸；打印段强制还原 1:1）。
   * 可用宽度要扣掉纸张区自己的左右内边距，以及同一行里别的东西（数独的作答面板）。
   */
  function fit(reserve) {
    var wrap = doc.getElementById('preview-wrap')
    var preview = doc.getElementById('preview')
    var sheet = doc.querySelector('#preview .sheet')
    if (!wrap || !preview || !sheet) return
    var cs = root.getComputedStyle(wrap)
    var avail = wrap.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight) - (reserve || 0)
    var factor = Math.min(1, avail / sheet.offsetWidth)
    preview.style.zoom = factor < 1 ? String(Math.max(0.3, factor)) : ''
  }

  /* ---------- 从「今天」点「打印」进来：先看一眼，再确认 ---------- */

  function confirmPrint() {
    var wrap = doc.getElementById('preview-wrap')
    var printBtn = doc.getElementById('btn-print')
    if (!wrap || !printBtn) return
    var bar = doc.createElement('div')
    bar.className = 'confirm-bar'
    bar.setAttribute('role', 'status')
    bar.innerHTML =
      '<p><b>这是上次的设置。</b>看一眼下面的纸，没问题就打印。</p>' +
      '<button type="button" class="btn btn-primary" data-act="print">打印</button>' +
      '<button type="button" class="btn" data-act="close">先调整一下</button>'
    bar.addEventListener('click', function (e) {
      var b = e.target.closest('[data-act]')
      if (!b) return
      bar.remove()
      if (b.dataset.act === 'print') printBtn.click()
    })
    wrap.insertBefore(bar, wrap.firstChild)
  }

  /* ---------- 打印文件名不撞车 ---------- */

  /*
   * 「另存为 PDF」的默认文件名取自页面标题，标题固定 → 每次存都同名、被问要不要替换。
   * 打印前把年月日-时分秒拼进标题（beforeprint 连 Ctrl/Cmd+P 也接得住），打完还原。
   * 标题只动打印那一瞬间，屏幕和卷面都不受影响。
   */
  function pad(n) {
    return (n < 10 ? '0' : '') + n
  }

  function stamp() {
    var d = new Date()
    return '' + d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + '-' +
      pad(d.getHours()) + pad(d.getMinutes()) + pad(d.getSeconds())
  }

  var printTitle = null

  root.addEventListener('beforeprint', function () {
    if (printTitle !== null) return
    printTitle = doc.title
    doc.title = printTitle + ' · ' + stamp()
  })

  root.addEventListener('afterprint', function () {
    if (printTitle === null) return
    doc.title = printTitle
    printTitle = null
  })

  function init() {
    Array.prototype.forEach.call(doc.querySelectorAll('select[data-seg]'), buildSeg)
    Array.prototype.forEach.call(doc.querySelectorAll('input[data-stepper]'), buildStepper)
    sync()
  }

  /* 外壳在 main 之前加载，DOM 已经解析到这里了（script 都在 body 末尾），直接装 */
  init()

  /* 确认条等 main 把纸渲染出来再插，排在提示条前面 */
  doc.addEventListener('DOMContentLoaded', function () {
    if (wantPrint) confirmPrint()
  })

  root.SumSum = root.SumSum || {}
  root.SumSum.shell = { sync: sync, summary: summary, fit: fit }
})(window)
