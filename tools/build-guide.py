from pathlib import Path
import json, importlib.util
root=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('pdf_renderer',Path(__file__).with_name('pdf-renderer.py'))
renderer=importlib.util.module_from_spec(spec);spec.loader.exec_module(renderer)
data=json.loads((root/'documentation/guide.json').read_text(encoding='utf-8'))
renderer.make_pdf(root/'docs/downloads/Creator-Guide.pdf',data['pages'],data['title'])
print('Built Creator-Guide.pdf')
