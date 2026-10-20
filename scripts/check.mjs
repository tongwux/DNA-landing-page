import { readFileSync, existsSync } from 'node:fs';
import assert from 'node:assert/strict';
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const script = readFileSync(new URL('../app.js', import.meta.url), 'utf8');
const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
assert.equal(new Set(ids).size, ids.length, 'HTML contains duplicate IDs');
for (const [, id] of script.matchAll(/getElementById\(['"]([^'"]+)['"]\)/g)) {
  assert(ids.includes(id), `Renderer references missing DOM element #${id}`);
}
for (const [, id] of html.matchAll(/href="#([^"]+)"/g)) {
  assert(ids.includes(id), `Broken in-page link #${id}`);
}
for (const [, path] of html.matchAll(/(?:src|href)="([^"#]+\.(?:js|css|svg))"/g)) {
  assert(existsSync(new URL('../' + path, import.meta.url)), `Missing asset: ${path}`);
}
for (const key of ['at', 'gc', 'backbone']) {
  assert(html.includes(`data-feature="${key}"`), `Missing DNA hotspot ${key}`);
  assert(html.includes(`data-detail="${key}"`), `Missing DNA detail control ${key}`);
}
assert(html.includes('id="dna-inspector"'), 'DNA detail panel must ship with the renderer');
assert.equal([...html.matchAll(/data-solution=/g)].length, 3, 'All research cards need a working detail view');
console.log('Page integrity passed: DNA controls, DOM contracts, research cards, anchors and local assets.');
