"""Build a static release with content-addressed assets to avoid stale model caches."""
from pathlib import Path
import hashlib
import json
import os
import shutil
import subprocess

root = Path(__file__).resolve().parents[1]
out = root / '_site'
if out.exists():
    shutil.rmtree(out)
out.mkdir()
html = (root / 'index.html').read_text()
for filename in ('app.js', 'styles.css', 'favicon.svg'):
    data = (root / filename).read_bytes()
    path = Path(filename)
    digest = hashlib.sha256(data).hexdigest()[:12]
    versioned = f'{path.stem}.{digest}{path.suffix}'
    (out / versioned).write_bytes(data)
    html = html.replace(f'"{filename}"', f'"{versioned}"')
(out / 'index.html').write_text(html)
shutil.copy2(root / '.nojekyll', out / '.nojekyll')
revision = os.environ.get('GITHUB_SHA') or subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=root, text=True).strip()
(out / 'release.json').write_text(json.dumps({'commit': revision}) + '\n')
print(f'Built release {revision} with content-addressed assets')
