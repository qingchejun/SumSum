/**
 * 使用说明：顶栏右上角的「使用说明」按钮 + 弹窗。
 *
 * 四个页面共用这一个文件，按钮和弹窗都由这里插进 .topbar，HTML 里只需一行 script。
 * 打开时默认翻到当前页面那个板块。第一次来这个站的人自动弹一次（记在 localStorage，
 * 读写失败就当「来过」，宁可不弹也别每次都弹）。
 *
 * 文案全是写死的，没有任何用户输入，可以直接进 innerHTML。
 * 弹窗里还有「导出 / 导入备份」，数据逻辑在 js/backup.js，页面上须先于本文件加载。
 * 改了哪个板块的功能，记得回来同步这里的说明。
 */
;(function (root) {
  'use strict'

  var doc = root.document
  var SEEN_KEY = 'sumsum:help:seen'

  /* 四个板块都一样的部分：放在最上面，谁先看到都能明白这个站怎么用 */
  var COMMON =
    '<ol class="help-steps">' +
      '<li><b>左边设置</b>：选题型、范围、题量。</li>' +
      '<li><b>右边就是纸</b>：屏幕上看到的，就是打印出来的样子。</li>' +
      '<li><b>点面板底部的蓝色按钮打印</b>：纸张选 A4；打印对话框里把「页眉和页脚」关掉，纸面更干净。</li>' +
    '</ol>' +
    '<p class="help-note">口算、数独、识字的设置会写进网址：<b>把链接收藏或发给别人，打开就是一模一样的那张卷子</b>。' +
      '想换一批题，点「↻ 重新生成」。</p>' +
    '<div class="help-backup">' +
      '<p>奥数「已学」标记、识字的进度和错字集存在<b>这台电脑的这个浏览器</b>里。' +
        '<b>换电脑、换网址</b>（比如从旧网址 sumsum-3nx.pages.dev 搬过来）之前，先在原来的地方点「导出备份」存一个文件，' +
        '再到新的地方点「导入备份」选这个文件。</p>' +
      '<div class="help-backup-btns">' +
        '<button type="button" class="btn btn-ghost" data-bk="export">导出备份</button>' +
        '<button type="button" class="btn btn-ghost" data-bk="import">导入备份</button>' +
        '<input type="file" accept=".json,application/json" hidden />' +
      '</div>' +
      '<div class="help-backup-msg" role="status" hidden></div>' +
    '</div>'

  var MODULES = [
    {
      key: '口算',
      lead: '加减乘除口算题，一张 A4 练习纸。适合每天 5 分钟的计算练习。',
      items: [
        '<b>最快的用法</b>：点「快速预设」里的一个按钮（如「20以内进退位」「乘法口诀」），马上出一张。',
        '<b>自己配</b>：「运算模式」选加法 / 减法 / 乘除 / 四则等，再设数值范围；加减法可以指定只出、多出或不出进位退位题。',
        '<b>题量与排版</b>：题目数量、每行几列、A4 纵向或横向都能调。每 10 题一组，中间有虚线，方便分段计时。',
        '<b>常用选项</b>：「跳过送分题」去掉 7+0、5×1 这类题；「附答案页」打印时多一页答案；加减法还能在答案页附凑十 / 破十提示，给家长讲题用。',
        '满意这张就直接打印；不满意点「↻ 重新生成」换一批。'
      ]
    },
    {
      key: '奥数',
      lead: '40 个思维知识点，一天一个。每个知识点有讲解页、练习题和分步解析。',
      items: [
        '<b>选知识点</b>：面板上方切换「L1 · 立足算理」「L2 · 思维启蒙」，点知识点名称就换到那一课。',
        '<b>标记进度</b>：点名称前面的小圆点，标成「已学 ✓」。标过之后会出现「接着学 →」按钮，直接跳到下一课。',
        '<b>题型与难度</b>：每个知识点有几种题型，至少勾一种；难度分 20 以内 / 50 以内 / 100 以内。',
        '<b>推荐这样打印</b>：勾上「附讲解页」和「附解析页」。先和孩子一起看讲解页的方法和例题，再让孩子做练习，最后家长对着解析页讲。',
        '<b>综合复习</b>：学过几课后，打开「出一张综合复习卷」，会从标了「已学」的知识点里混合出题，解析页标明每题出自哪一课。'
      ]
    },
    {
      key: '数独',
      lead: '4 / 6 / 9 宫格数独。每一道都保证不用猜，一步步排除就能做完。可以打印，也可以直接在屏幕上玩。',
      items: [
        '<b>盘型</b>：初学从四宫格开始，熟练了换六宫格，最后到标准九宫格。',
        '<b>难度滑块</b>：拖动是在选「给几个提示数」，给得越少越难。拖到哪一档都不会卡死。',
        '<b>比赛玩法</b>：「打印份数」选 2 份，同一套题印两张，父子各一张，看谁先做完。',
        '<b>在屏幕上玩</b>：勾上「屏幕上可以直接玩」，先点空格子，再点下方数字条（或按键盘 1～9）。方向键移动，退格键擦除，Ctrl+Z 撤销。',
        '<b>卡住了</b>：点「💡 提示」，会填上一格并说明为什么是这个数。直接点数字条上的数，能把盘上所有同样的数高亮出来。',
        '<b>做完了</b>：点「提交批改」（或按回车），错的格子会标红。计时从填第一个数开始，全对才停。'
      ]
    },
    {
      key: '识字',
      lead: '复习洪恩识字学过的 1600 个字。每周 100 字，正好一张 A4，16 周复习一遍。只印字，不印拼音：孩子念，你听。',
      items: [
        '<b>本周复习</b>：打印这一周的字。印完点「下一周 ▶」，进度会记住，下次打开还在这一周。',
        '<b>记下不会的字</b>：孩子念不出来的字，在屏幕卷面上点一下，格子变红，这个字就进了错字集。可以边念边点，也可以先在纸上圈出来，事后对着点。<b>纸上不会印出任何标记</b>。',
        '<b>错字集</b>：切到「错字集」页签，打印一张全是错字的卷子。格子右上角的数字表示还要认出几次：认出来了点一下，2 变 1；<b>改天</b>再认出来，再点一下才移出。当天点错了，再点一下就撤回。',
        '<b>顺带复习错字</b>：在「本周复习」里勾上「复习卷后面附一页错字」，会从错字集里随机抽 20 个字附在后面。',
        '<b>整表核对</b>：拿来和原字表逐页对照用的，不是给孩子做的卷子。',
        '<b>换电脑、换网址</b>：错字集和进度只存在这个浏览器里，用上面的「导出备份 / 导入备份」带过去。'
      ]
    }
  ]

  function currentModule() {
    var a = doc.querySelector('.topbar-tabs a.active')
    var name = a ? a.textContent.trim() : ''
    for (var i = 0; i < MODULES.length; i++) {
      if (MODULES[i].key === name) return i
    }
    return 0
  }

  function build() {
    var bar = doc.querySelector('.topbar')
    if (!bar) return

    var btn = doc.createElement('button')
    btn.type = 'button'
    btn.className = 'help-btn'
    btn.innerHTML = '<span class="help-q" aria-hidden="true">?</span>使用说明'
    bar.appendChild(btn)

    var tabs = MODULES.map(function (m, i) {
      return '<button type="button" class="stage-tab" data-i="' + i + '">' + m.key + '</button>'
    }).join('')
    var bodies = MODULES.map(function (m, i) {
      return '<section class="help-mod" data-i="' + i + '">' +
        '<p class="help-lead">' + m.lead + '</p>' +
        '<ul class="help-list">' + m.items.map(function (t) { return '<li>' + t + '</li>' }).join('') + '</ul>' +
        '</section>'
    }).join('')

    var dlg = doc.createElement('dialog')
    dlg.className = 'help-dialog'
    dlg.setAttribute('aria-labelledby', 'help-title')
    dlg.innerHTML =
      '<div class="help-head">' +
        '<h2 id="help-title">使用说明</h2>' +
        '<button type="button" class="help-close" aria-label="关闭">×</button>' +
      '</div>' +
      '<div class="help-body">' +
        '<h3 class="help-h">三步出一张练习纸</h3>' + COMMON +
        '<h3 class="help-h">四个板块</h3>' +
        '<div class="stage-tabs help-tabs">' + tabs + '</div>' +
        bodies +
      '</div>'
    doc.body.appendChild(dlg)

    function show(i) {
      dlg.querySelectorAll('.help-tabs .stage-tab').forEach(function (b) {
        b.classList.toggle('active', +b.dataset.i === i)
      })
      dlg.querySelectorAll('.help-mod').forEach(function (s) {
        s.hidden = +s.dataset.i !== i
      })
    }

    function open() {
      show(currentModule())
      dlg.showModal()
      dlg.querySelector('.help-body').scrollTop = 0
    }

    btn.addEventListener('click', open)
    dlg.querySelector('.help-close').addEventListener('click', function () { dlg.close() })
    dlg.querySelector('.help-tabs').addEventListener('click', function (e) {
      var b = e.target.closest('.stage-tab')
      if (b) show(+b.dataset.i)
    })
    /* 点弹窗外的灰色遮罩关闭：点击落在 dialog 元素本身（而不是里面的内容）时就是点了遮罩 */
    dlg.addEventListener('click', function (e) {
      if (e.target === dlg) dlg.close()
    })

    wireBackup(dlg.querySelector('.help-backup'))

    var seen = true
    try {
      seen = !!root.localStorage.getItem(SEEN_KEY)
      root.localStorage.setItem(SEEN_KEY, '1')
    } catch (e) { /* 存不了就不自动弹 */ }
    if (!seen) open()
  }

  /* ---------- 备份 / 搬家（数据逻辑在 js/backup.js，这里只管按钮和提示） ---------- */

  function stamp() {
    var d = new Date()
    var p = function (n) {
      return (n < 10 ? '0' : '') + n
    }
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate())
  }

  function wireBackup(box) {
    var B = root.SumSum && root.SumSum.backup
    if (!B) {
      box.hidden = true
      return
    }
    var msg = box.querySelector('.help-backup-msg')
    var file = box.querySelector('input[type=file]')
    var pending = null

    /* 所有文字都是写死的文案或 describe() 拼出来的固定句式，数字来自 JSON，不含文件里的原始字符串 */
    function say(html, kind) {
      msg.innerHTML = html
      msg.className = 'help-backup-msg' + (kind ? ' is-' + kind : '')
      msg.hidden = false
    }

    function list(lines) {
      return '<ul>' + lines.map(function (t) { return '<li>' + t + '</li>' }).join('') + '</ul>'
    }

    function doExport() {
      var pack
      try {
        pack = B.collect(root.localStorage)
      } catch (e) {
        return say('这个浏览器不允许读取本地数据（可能是无痕模式），没法导出。', 'bad')
      }
      if (!Object.keys(pack.data).length) {
        return say('这个浏览器上还没有可以备份的进度。', 'bad')
      }
      var name = '练习纸备份-' + stamp() + '.json'
      var url = URL.createObjectURL(new Blob([JSON.stringify(pack)], { type: 'application/json' }))
      var a = doc.createElement('a')
      a.href = url
      a.download = name
      doc.body.appendChild(a)
      a.click()
      a.remove()
      setTimeout(function () { URL.revokeObjectURL(url) }, 1000)
      say('已下载 <b>' + name + '</b>，里面有：' + list(B.describe(pack.data)) +
        '到新电脑或新网址上，打开「使用说明」点「导入备份」选这个文件。', 'ok')
    }

    function confirmImport(r) {
      pending = r
      say('备份里有：' + list(B.describe(r.data)) +
        '导入后，这个浏览器上<b>同样的这几项会被备份里的替换掉</b>。' +
        '<div class="help-backup-btns">' +
          '<button type="button" class="btn btn-primary" data-bk="confirm">确认导入</button>' +
          '<button type="button" class="btn btn-ghost" data-bk="cancel">取消</button>' +
        '</div>')
    }

    function doImport() {
      if (!pending) return
      try {
        B.apply(root.localStorage, pending.data)
      } catch (e) {
        pending = null
        return say('这个浏览器不允许写入本地数据（可能是无痕模式），导入没有成功。', 'bad')
      }
      pending = null
      say('导入成功，页面马上刷新。', 'ok')
      /* 各板块只在页面加载时读一次存储，刷新一下才能看到导入的进度 */
      setTimeout(function () { root.location.reload() }, 900)
    }

    file.addEventListener('change', function () {
      var f = file.files && file.files[0]
      file.value = '' // 同一个文件再选一次也要触发 change
      if (!f) return
      var reader = new FileReader()
      reader.onload = function () {
        var r = B.parse(String(reader.result))
        if (r.ok) confirmImport(r)
        else say(r.error, 'bad')
      }
      reader.onerror = function () { say('文件读不出来，请重新选一次。', 'bad') }
      reader.readAsText(f)
    })

    box.addEventListener('click', function (e) {
      var b = e.target.closest('[data-bk]')
      if (!b) return
      var act = b.getAttribute('data-bk')
      if (act === 'export') doExport()
      else if (act === 'import') file.click()
      else if (act === 'confirm') doImport()
      else if (act === 'cancel') {
        pending = null
        msg.hidden = true
      }
    })
  }

  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', build)
  else build()
})(window)
