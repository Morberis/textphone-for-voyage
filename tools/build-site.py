from pathlib import Path
import json, html

root=Path(__file__).resolve().parents[1]
if not (root/'documentation/site.json').exists():
    raise SystemExit('Copy this builder to a project tools/build-site.py first.')
settings=json.loads((root/'documentation/site.json').read_text(encoding='utf-8'))
guide=json.loads((root/'documentation/guide.json').read_text(encoding='utf-8'))
escape=html.escape
navigation=[]; sections=[]
for index,page in enumerate(guide['pages'],1):
    anchor=f'section-{index}'
    navigation.append(f'<a href="#{anchor}">{escape(page["title"])}</a>')
    body=f'<section id="{anchor}"><h2>{escape(page["title"])}</h2>'
    if page.get('lead'):body+=f'<p class="lead">{escape(page["lead"])}</p>'
    for value in page.get('paragraphs',[]):body+=f'<p>{escape(value)}</p>'
    if page.get('code'):body+='<pre><code>'+escape(page['code'].replace('\n  ',' ') if page['title'] in ['Merge your world export','Add the result in Voyage'] else page['code'])+'</code></pre>'
    if page.get('table'):
        body+='<div class="table-wrap"><table><thead><tr>'+''.join('<th scope="col">'+escape(v)+'</th>' for v in page['table'][0])+'</tr></thead><tbody>'
        for row in page['table'][1:]:body+='<tr>'+''.join('<td>'+escape(v)+'</td>' for v in row)+'</tr>'
        body+='</tbody></table></div>'
    for value in page.get('paragraphs_after',[]):body+=f'<p>{escape(value)}</p>'
    if page.get('bullets'):body+='<ul>'+''.join('<li>'+escape(v)+'</li>' for v in page['bullets'])+'</ul>'
    for label,url in page.get('links',[]):body+=f'<p><a href="{escape(url,quote=True)}">{escape(label)}</a></p>'
    if page.get('note'):body+=f'<p class="note">{escape(page["note"])}</p>'
    for n,label in enumerate(page.get('checklist',[])):
        body+=f'<label class="check"><input type="checkbox" data-check="{index}-{n}"><span>{escape(label)}</span></label>'
    sections.append(body+'</section>')
slug=settings['slug'];title=escape(settings['title'])
package_button= f'<a href="downloads/{slug}-0.6.0.zip" download>Download creator ZIP</a>'
start=next(i for i,p in enumerate(guide['pages'],1) if p['title']=='Customize and rebuild')
install=next(i for i,p in enumerate(guide['pages'],1) if p['title']=='Merge your world export')
api=escape((root/'API-REFERENCE.txt').read_text(encoding='utf-8'))
navigation.insert(-1,'<a href="#api">API reference</a>')
sections.insert(-1,f'<section id="api"><h2>API reference</h2><pre>{api}</pre></section>')
page=f'''<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="description" content="TextPhone creator documentation: installation, configuration, custom apps, API, examples and downloads for Voyage."><title>{title} — Documentation</title><link rel="stylesheet" href="style.css"></head>
<body><a class="skip" href="#main">Skip to documentation</a><header><div class="eyebrow">TEXTPHONE / VOYAGE / 0.6.0</div><h1>{title}</h1><p>A phone inside your story. Give players apps, changing shortcuts, an App Store and service menus through the chat they already use.</p><p>Single-player tested preview. Scripts track the interface; narration presents it and can make mistakes. Read the installation and troubleshooting sections before deployment. The repository includes offline tests and build tools; deployment into Voyage is a separate workflow.</p><div class="buttons"><a href="#section-{start}">Customize apps</a><a href="#section-{install}">Add to Voyage</a><a href="downloads/Creator-Guide.pdf" download>Download PDF guide</a>{package_button}<a href="https://github.com/Morberis/{slug}">Source and tests on GitHub</a></div></header>
<div class="layout"><nav aria-label="Documentation sections"><h2>Contents</h2>{''.join(navigation)}</nav><main id="main">{''.join(sections)}</main></div><footer>TextPhone 0.6.0 · September 2026 · Independent community project · <a href="https://github.com/Morberis/{slug}/blob/main/LICENSE">MIT license</a></footer><script src="checklist.js"></script></body></html>'''
(root/'docs/index.html').write_text(page,encoding='utf-8')
(root/'docs/checklist.js').write_text('''// Checkmarks stay in this browser; they are never sent to a server.
for (const checkbox of document.querySelectorAll('[data-check]')) {
  const key = 'textphone:' + location.pathname + ':' + checkbox.dataset.check;
  try { checkbox.checked = localStorage.getItem(key) === 'true'; } catch {}
  checkbox.addEventListener('change', () => {
    try { localStorage.setItem(key, String(checkbox.checked)); } catch {}
  });
}
''',encoding='utf-8')
print('Built complete documentation site:',settings['slug'])
