/**
 * 错字集：在预览的卷面上点一下，就把那个字加入 / 移出错字集。
 *
 * 一条规则贯穿三种模式 ——【红底 = 在错字集里，点一下 = 切换】。
 * 本周复习卷上点，是「他这个字不认识」；错字集卷上点，是「他认出来了，拿掉」。
 * 两件事在用户眼里是同一个动作，所以刻意不做语义反转（比如错字集里点表示「认识了」
 * 却显示成打勾），那会变成两套规则，每次都要先想自己在哪一页。
 * 移出之后的样子和从没标记过的字完全一样，也就不需要第三种视觉状态。
 *
 * 【点击绝不触发重新渲染】—— 这是这个功能好不好用的分水岭。
 * shizi-main 的 refresh() 会把 #preview 的 innerHTML 整个换掉；若每点一次就 refresh，
 * 错字集页面上点掉一个字，网格立刻重新流动，下一个字跳到手指底下，必然误点。
 * 所以这里只改被点那一格的 class，卷面结构一动不动，什么时候重排由用户自己决定。
 *
 * 绑定方式抄 js/shudu-play.js：事件委托绑在【永不被替换的】#preview 上，只绑一次
 * （bind）；每次 render 之后把状态重新投影到新 DOM 上（paint）。字格上一个监听器都不绑。
 */
(function (root) {
  'use strict'

  var doc = root.document

  /*
   * 存储。命名沿用 sumsum:<板块>:<用途>:v1，与奥数的 sumsum:aoshu:learned:v1 同级。
   *
   * 【绝不能并进 settings】：shizi-settings 的 save() 会把非默认项写进网址，
   * 错字集进去等于把孩子的个人进度塞进分享链接，语义全错，几百个汉字也会让网址没法看。
   *
   * 【存汉字本身，不存字表下标】：每周字数是可改的，下标会随之漂移
   *（remapWeek 那套换算就是在处理这个问题），汉字则天然稳定。
   */
  var KEY = 'sumsum:shizi:wrong:v1'

  function load() {
    try {
      var arr = JSON.parse(root.localStorage.getItem(KEY))
      /* Array.isArray 同时挡住 null 和被人手改坏的值 */
      return new Set(Array.isArray(arr) ? arr : [])
    } catch (e) {
      return new Set() // 隐私模式或数据损坏时当作空集
    }
  }

  function save(set) {
    try {
      root.localStorage.setItem(KEY, JSON.stringify(Array.from(set)))
    } catch (e) {
      /* 隐私模式下写入失败可忽略 */
    }
  }

  var wrong = load()
  var listeners = []

  function fire() {
    listeners.forEach(function (fn) {
      fn(wrong.size)
    })
  }

  function has(ch) {
    return wrong.has(ch)
  }

  function size() {
    return wrong.size
  }

  /* 按字表顺序排好的错字数组。排序逻辑在 shizi-core（纯函数，node 里测得动） */
  function all() {
    return root.SumSum.shizi.sortByTable(Array.from(wrong))
  }

  function toggle(ch) {
    if (!ch) return false
    if (wrong.has(ch)) wrong.delete(ch)
    else wrong.add(ch)
    save(wrong)
    fire()
    return wrong.has(ch)
  }

  function clear() {
    wrong.clear()
    save(wrong)
    fire()
  }

  function onChange(fn) {
    listeners.push(fn)
  }

  /*
   * 把集合投影到当前 DOM 上。每次 render 之后调一次（见 shizi-main 的 refresh），
   * 位置对应数独 shudu-main.js 里 render() 紧跟 attach() 的那两行。
   * 全量重刷、不做增量：一页最多两百来个格子，重算一遍 class 是微秒级，
   * 而增量更新要维护「上次是什么状态」，是 bug 的温床。
   */
  function paint() {
    var cells = doc.querySelectorAll('#preview .shizi-cell')
    for (var i = 0; i < cells.length; i++) {
      cells[i].classList.toggle('is-wrong', wrong.has(cells[i].dataset.ch))
    }
  }

  /*
   * 只调一次。#preview 的内容会反复重渲染，但容器本身不换，所以委托绑在它上面。
   *
   * 同一个字在一页上只会出现一次，但整表核对是 9 页连排、一个字仍然只出现一次；
   * 真正需要多格同步的情况是「打印份数 = 2」时同一页连印两张 —— 那两张上的同一个字
   * 必须一起变色，否则用户会以为没点上。所以这里按 data-ch 全量同步，而不是只改被点的那一格。
   */
  function bind() {
    var preview = doc.getElementById('preview')
    if (!preview) return
    preview.addEventListener('click', function (ev) {
      var cell = ev.target.closest ? ev.target.closest('.shizi-cell') : null
      if (!cell || !preview.contains(cell)) return
      var ch = cell.dataset.ch
      if (!ch) return
      var on = toggle(ch)
      var same = preview.querySelectorAll('.shizi-cell[data-ch="' + ch.replace(/"/g, '\\"') + '"]')
      for (var i = 0; i < same.length; i++) {
        same[i].classList.toggle('is-wrong', on)
      }
    })
  }

  root.SumSum = root.SumSum || {}
  root.SumSum.shiziMark = {
    bind: bind,
    paint: paint,
    onChange: onChange,
    has: has,
    size: size,
    all: all,
    toggle: toggle,
    clear: clear
  }
})(typeof window !== 'undefined' ? window : globalThis)
