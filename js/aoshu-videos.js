/**
 * 奥数讲解视频登记表：哪一课有视频、多长。
 *
 * 视频不进仓库，放在 Cloudflare R2 的 lianxizhi-video 桶里，经 video.qingchejun.com 访问，
 * 路径固定是 aoshu/<知识点 id>.mp4。加一个视频 = 传文件 + 在 LIST 里加一行：
 *   npx wrangler r2 object put lianxizhi-video/aoshu/<id>.mp4 --file=… --content-type=video/mp4 --remote
 * 传之前确认 moov 在 mdat 前面（边下边播），否则要先 ffmpeg -movflags +faststart。
 *
 * 时长手写而不是读视频元数据：首页卡片和目录要在视频加载之前就显示「有讲解视频 3:13」。
 */
;(function (root) {
  'use strict'

  var BASE = 'https://video.qingchejun.com/aoshu/'

  /* 知识点 id → 时长 */
  var LIST = Object.freeze({
    yiduobushao: '3:42', // 03 移多补少（基础篇）
    shuzimi: '3:09', // 06 数字谜问题（基础篇）
    xulie: '3:13' // 08 数列找规律
  })

  /* 有视频返回 { src, dur }，没有返回 null。hasOwnProperty：别让 'toString' 这类名字查到原型链上 */
  function of(id) {
    if (!Object.prototype.hasOwnProperty.call(LIST, id)) return null
    return { src: BASE + id + '.mp4', dur: LIST[id] }
  }

  root.SumSum = root.SumSum || {}
  root.SumSum.aoshuVideos = { list: LIST, of: of }
})(typeof window !== 'undefined' ? window : globalThis)
