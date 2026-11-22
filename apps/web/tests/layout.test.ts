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

import { sectionHref, scrollToHashOnce, resetScrollOnceForTest } from '../src/Lib/layout.ts';

test('nav keeps the query on home and goes to / from legal pages', () => {
  assert.equal(sectionHref('/', 'discovery'), '#discovery');
  assert.equal(sectionHref('/privacy', 'contact'), '/#contact');
  assert.equal(sectionHref('/terms', 'discovery'), '/#discovery');
});

test('scrollToHashOnce scrolls once and ignores empty, unknown, invalid hashes', () => {
  const hits: string[] = [];
  const doc = { getElementById: (id: string) => (id === 'discovery' ? { scrollIntoView: () => hits.push(id) } : null) } as never;
  for (const hash of ['', '#', '#nope', '#%']) {
    resetScrollOnceForTest();
    assert.doesNotThrow(() => scrollToHashOnce(hash, doc));
  }
  assert.equal(hits.length, 0);
  resetScrollOnceForTest();
  scrollToHashOnce('#discovery', doc);
  scrollToHashOnce('#discovery', doc);
  assert.deepEqual(hits, ['discovery']);
});
