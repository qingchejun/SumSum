/**
 * 奥数练习纸渲染与分页。
 *
 * 与口算 render.js 同一思路：JS 显式分页，每页自带页眉页脚，题目绝不跨页截断。
 * 纸张骨架（.sheet / .sheet-head / .sheet-foot）与口算共用类名和 CSS，
 * 页眉「日期 姓名 用时 得分」等零件取自 SumSum.render.parts。
 * 奥数页固定 A4 纵向，单列布局：题目页每页 6 题，解析页每页 4 块。
 */
(function (root) {
  'use strict'

  /* 每页块数与块高（mm）——与 css/aoshu.css 打印段的 grid-auto-rows / min-height 硬对应 */
  var PAGE = {
    question: { perPage: 5 }, // 5 × 45mm = 225mm
    solution: { perPage: 3 } // 3 × 74.5mm = 223.5mm（留出圆点图示的空间）
  }

  function P() {
    return root.SumSum.render.parts
  }

  /* 题目块：题号 + 题干 + 演算留白 + 底部答句挖空行 */
  function questionBlockHTML(q, idx) {
    var p = P()
    return (
      '<div class="aq">' +
      '<div class="aq-stem"><span class="aq-num">' + p.numLabel(idx) + '</span>' +
      p.esc(q.stem) + '</div>' +
      '<div class="aq-work"></div>' +
      '<div class="aq-ans">列式：<span class="blank blank-expr"></span>　' +
      p.esc(q.ansLabel) + ' <span class="blank"></span> ' + p.esc(q.ansSuffix) +
      '</div>' +
      '</div>'
    )
  }

  /* 圆点对比图：两行圆点，实心是共同的部分，空心是多出来的部分 */
  function diagramHTML(d) {
    var p = P()
    var base = '●'.repeat(d.b)
    return (
      '<div class="sol-diagram">' +
      '<div class="dot-row"><span class="dot-label">' + p.esc(d.A) + '</span>' +
      '<span class="dots">' + base + '</span>' +
      '<span class="dots dots-extra">' + '○'.repeat(d.gap) + '</span></div>' +
      '<div class="dot-row"><span class="dot-label">' + p.esc(d.B) + '</span>' +
      '<span class="dots">' + base + '</span></div>' +
      '<div class="dot-note">○ 是多出来的 ' + d.gap + ' ' + d.u +
      '，移走一半（' + d.m + ' ' + d.u + '）给' + p.esc(d.B) + '，两人就一样多</div>' +
      '</div>'
    )
  }

  /* 步骤列表（讲解页例题与解析块共用），返回 <ul> + 答句 */
  function stepsHTML(solution) {
    var p = P()
    var steps = solution
      .filter(function (st) {
        return st.tag !== '答'
      })
      .map(function (st) {
        return (
          '<li><span class="step-tag">' + p.esc(st.tag) + '</span>　' +
          p.esc(st.text) + '</li>'
        )
      })
      .join('')
    var answer = solution.filter(function (st) {
      return st.tag === '答'
    })[0]
    return (
      '<ul class="sol-steps">' + steps + '</ul>' +
      (answer ? '<div class="sol-answer">答：' + p.esc(answer.text) + '</div>' : '')
    )
  }

  /* 知识点讲解页：概念 → 思路（配图）→ 例题示范 → 口诀，内容来自 topic.lesson */
  function lessonBodyHTML(lesson) {
    var p = P()
    return lesson.sections
      .map(function (sec) {
        var body = ''
        if (sec.paras) {
          body += sec.paras
            .map(function (t) {
              return '<p class="lesson-p">' + p.esc(t) + '</p>'
            })
            .join('')
        }
        if (sec.diagram) body += diagramHTML(sec.diagram)
        if (sec.example) {
          body +=
            '<div class="lesson-example">' +
            '<div class="lesson-stem">' + p.esc(sec.example.stem) + '</div>' +
            stepsHTML(sec.example.solution) +
            '</div>'
        }
        if (sec.chant) body += '<div class="lesson-chant">' + p.esc(sec.chant) + '</div>'
        return (
          '<section class="lesson-sec">' +
          '<h3 class="lesson-h">' + p.esc(sec.heading) + '</h3>' +
          body +
          '</section>'
        )
      })
      .join('')
  }

  /* 解析块：题干重印（小号灰字）+ 圆点图示（若有）+ 分步骤讲解 + 加粗答句 */
  function solutionBlockHTML(q, idx) {
    var p = P()
    return (
      '<div class="sol">' +
      '<div class="sol-stem"><span class="aq-num">' + p.numLabel(idx) + '</span>' +
      p.esc(q.stem) + '</div>' +
      (q.diagram ? diagramHTML(q.diagram) : '') +
      stepsHTML(q.solution) +
      '</div>'
    )
  }

  function pageHTML(opts) {
    var p = P()
    return (
      '<section class="sheet">' +
      '<header class="sheet-head">' +
      '<h2 class="sheet-title">' + p.esc(opts.title) + '</h2>' +
      p.metaHTML() +
      '</header>' +
      '<div class="' + opts.gridClass + '">' + opts.blocksHTML + '</div>' +
      '<footer class="sheet-foot">' +
      opts.footPrefix + '第 ' + opts.pageNo + ' 页 / 共 ' + opts.pageTotal + ' 页' +
      '</footer>' +
      '</section>'
    )
  }

  function paginate(list, perPage) {
    var pages = []
    for (var i = 0; i < list.length; i += perPage) {
      pages.push(list.slice(i, i + perPage))
    }
    return pages
  }

  /*
   * 内容超高兜底（仿口算 fitSheet）：块内容比格子高时逐 px 缩字号（下限 11px）。
   * 解析步骤由模板生成、行数上限可控，正常不会触发，只作 L3 长数字等极端情况的双保险。
   */
  function fitBlocks(container) {
    var blocks = container.querySelectorAll('.aq, .sol')
    Array.prototype.forEach.call(blocks, function (block) {
      var size = parseFloat(root.getComputedStyle(block).fontSize)
      while (block.scrollHeight > block.clientHeight + 1 && size > 11) {
        size -= 1
        block.style.fontSize = size + 'px'
      }
    })
  }

  /* 一批页面（题目页或解析页）的 HTML 数组 */
  function sheetsHTML(questions, opts) {
    var pages = paginate(questions, opts.perPage)
    return pages.map(function (page, p) {
      var blocks = page
        .map(function (q, i) {
          return opts.blockHTML(q, p * opts.perPage + i + 1)
        })
        .join('')
      return pageHTML({
        title: opts.title,
        blocksHTML: blocks,
        gridClass: opts.gridClass,
        pageNo: p + 1,
        pageTotal: pages.length,
        footPrefix: opts.footPrefix
      })
    })
  }

  /* 主入口：（可选）讲解页 + 题目页 + （可选）解析页 */
  function render(container, s, questions) {
    var topic = root.SumSum.aoshu.topics[s.topic]
    var title = s.title || topic.titleFor(s)
    var html = []

    if (s.lessonPage && topic.lesson) {
      html.push(
        pageHTML({
          title: topic.lesson.title,
          blocksHTML: lessonBodyHTML(topic.lesson),
          gridClass: 'lesson-flow',
          pageNo: 1,
          pageTotal: 1,
          footPrefix: '讲解 · '
        })
      )
    }

    html = html.concat(
      sheetsHTML(questions, {
        title: title,
        perPage: PAGE.question.perPage,
        gridClass: 'aoshu-grid',
        blockHTML: questionBlockHTML,
        footPrefix: ''
      })
    )

    if (s.answerPage) {
      html = html.concat(
        sheetsHTML(questions, {
          title: title + '（解析）',
          perPage: PAGE.solution.perPage,
          gridClass: 'sol-grid',
          blockHTML: solutionBlockHTML,
          footPrefix: '解析 · '
        })
      )
    }

    container.innerHTML = html.join('')
    fitBlocks(container)
  }

  root.SumSum = root.SumSum || {}
  root.SumSum.aoshu = root.SumSum.aoshu || {}
  root.SumSum.aoshu.render = { render: render }
})(typeof window !== 'undefined' ? window : globalThis)
