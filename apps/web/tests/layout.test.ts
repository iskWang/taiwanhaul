import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PAGE_CONTAINER } from '../src/Component/PageContainer/PageContainer.tsx';

const pages = { privacy: 'TaiwanHaul Privacy Notice', terms: 'Terms of Use' };

for (const [page, heading] of Object.entries(pages)) {
  test(`${page}.html keeps static text and the shared layout slots`, () => {
    const html = readFileSync(new URL(`../${page}.html`, import.meta.url), 'utf8');
    assert.match(html, new RegExp(`<main id="main" class="${PAGE_CONTAINER} `));
    assert.match(html, new RegExp(`<h1[^>]*>${heading}</h1>`));
    assert.match(html, /<div id="site-header" class="contents"><\/div>/);
    assert.match(html, /<div id="site-footer" class="contents"><\/div>/);
    assert.match(html, /<script type="module" src="\/src\/legal\.tsx"><\/script>/);
  });
}
