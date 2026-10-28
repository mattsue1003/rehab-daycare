# 把 src/ 內的 CSS 與 JS 內嵌成單一 index.html（離線可用、可直接放 GitHub Pages 或隨身碟）
import pathlib
d = pathlib.Path(__file__).parent
src = d / 'src'
JS = ['domain.js', 'store.js', 'core.js', 'logic.js', 'app.js', 'pages-main.js', 'pages-edit.js', 'pages-other.js', 'prints.js', 'demo.js']
html = (src / 'index.html').read_text(encoding='utf-8')
css = (src / 'styles.css').read_text(encoding='utf-8')
js = '\n'.join(f'/* ---- {f} ---- */\n' + (src / f).read_text(encoding='utf-8') for f in JS)
out = html.replace('/*STYLES*/', css).replace('/*SCRIPTS*/', js)
(d / 'index.html').write_text(out, encoding='utf-8')
print('index.html', len(out.encode()), 'bytes')
