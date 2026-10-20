"""Verify the deployed revision and critical assets using unauthenticated HTTPS."""
import json
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

base = sys.argv[1].rstrip('/') + '/'
expected = sys.argv[2]
assert base.startswith('https://'), 'Public release verification requires HTTPS'

def fetch(path):
    url = urllib.parse.urljoin(base, path) + '?release=' + expected
    request = urllib.request.Request(url, headers={'User-Agent': 'HELIXA-release-check', 'Cache-Control': 'no-cache'})
    with urllib.request.urlopen(request, timeout=20) as response:
        assert response.status == 200, f'{path}: HTTP {response.status}'
        return response.read().decode('utf-8')

for attempt in range(12):
    try:
        revision = json.loads(fetch('release.json'))['commit']
        assert revision == expected, f'Expected {expected}, received {revision}'
        html = fetch('index.html')
        assert 'id="dna-inspector"' in html and 'id="solution-dialog"' in html, 'Missing explorer or research dialog'
        script_path = re.search(r'<script src="(app\.[a-f0-9]{12}\.js)"', html)
        assert script_path, 'HTML must reference a versioned model script'
        script = fetch(script_path.group(1))
        assert 'function inspect(' in script and 'movingCamera' in script, 'Unexpected application script'
        style_path = re.search(r'href="(styles\.[a-f0-9]{12}\.css)"', html)
        assert style_path and '--brand:' in fetch(style_path.group(1)), 'Missing versioned styles'
        icon_path = re.search(r'href="(favicon\.[a-f0-9]{12}\.svg)"', html)
        assert icon_path and '<svg' in fetch(icon_path.group(1)), 'Missing versioned favicon'
        print(f'PUBLIC RELEASE VERIFIED: {base} (commit {revision})')
        break
    except (AssertionError, urllib.error.URLError, ValueError, KeyError) as error:
        if attempt == 11:
            raise
        print(f'Waiting for Pages propagation ({attempt + 1}/12): {error}', flush=True)
        time.sleep(5)
