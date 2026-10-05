#!/usr/bin/env python3
"""
把左侧板块栏写进五个页面。用法：python3 tools/rail.py

五个页面的板块栏一模一样，只有「当前是哪一个」不同。手抄五份迟早会改漏一份，
所以页面里只留 <!-- rail:今天 --> … <!-- /rail --> 这对标记，内容由本脚本生成。
改板块栏（加板块、换图标）只改这里，再跑一遍。
"""
import pathlib, re

ROOT = pathlib.Path(__file__).resolve().parent.parent

LINKS = [
    ('今天', 'index.html', '<path d="M4 11l8-7 8 7M6 9.5V20h12V9.5M10 20v-5h4v5"/>'),
    ('口算', 'kousuan.html', '<path d="M4 7h6M7 4v6M14 7h6M5 15l4 4M9 15l-4 4M14 16h6M14 19h6"/>'),
    ('奥数', 'aoshu.html', '<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.5c.8.8 1 1.5 1 2.5h6c0-1 .2-1.7 1-2.5A6 6 0 0 0 12 3z"/>'),
    ('数独', 'shudu.html', '<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M9.3 4v16M14.7 4v16M4 9.3h16M4 14.7h16"/>'),
    ('识字', 'shizi.html', '<path d="M12 6c-2-1.5-5-2-8-1.5v14c3-.5 6 0 8 1.5 2-1.5 5-2 8-1.5v-14c-3-.5-6 0-8 1.5zM12 6v14"/>'),
]

TAIL = (
    '  <span class="rail-gap"></span>\n'
    '  <button type="button" class="rail-link small" data-help><svg viewBox="0 0 24 24" aria-hidden="true">'
    '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6V14M12 17.5v.01"/>'
    '</svg><span>说明</span></button>\n'
    '  <button type="button" class="rail-link small" data-backup><svg viewBox="0 0 24 24" aria-hidden="true">'
    '<path d="M12 4v11M8 11l4 4 4-4M5 19h14"/></svg><span>备份</span></button>\n'
)

PAGES = {'index.html': '今天', 'kousuan.html': '口算', 'aoshu.html': '奥数', 'shudu.html': '数独', 'shizi.html': '识字'}


def rail(current):
    out = ['<nav class="rail" aria-label="板块">\n', '  <a class="rail-brand" href="index.html">练习纸</a>\n']
    for name, href, icon in LINKS:
        on = name == current
        out.append(
            '  <a class="rail-link%s" href="%s" data-module="%s"%s><svg viewBox="0 0 24 24" aria-hidden="true">%s</svg><span>%s</span></a>\n'
            % (' active' if on else '', href, name, ' aria-current="page"' if on else '', icon, name)
        )
    out.append(TAIL)
    out.append('</nav>')
    return ''.join(out)


for page, current in PAGES.items():
    path = ROOT / page
    text = path.read_text(encoding='utf-8')
    pat = re.compile(r'(<!-- rail:%s -->).*?(<!-- /rail -->)' % re.escape(current), re.S)
    if not pat.search(text):
        raise SystemExit('%s 里没找到 <!-- rail:%s --> 标记' % (page, current))
    text = pat.sub(lambda m: m.group(1) + '\n' + rail(current) + '\n' + m.group(2), text)
    path.write_text(text, encoding='utf-8')
    print('✓', page)
