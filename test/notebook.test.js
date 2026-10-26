const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { tmpDir, rm } = require('./helpers');
const { getIndexPath, readNotebook } = require('../hooks/noa-notebook');

function withNotebook(text, fn) {
  const cwd = tmpDir();
  try {
    if (text !== null) {
      fs.mkdirSync(path.dirname(getIndexPath(cwd)), { recursive: true });
      fs.writeFileSync(getIndexPath(cwd), text);
    }
    return fn(cwd);
  } finally { rm(cwd); }
}

const entry = (i) => `- 2026-10-${String(i).padStart(2, '0')} · session ${i} · ✓1 ✗0 ~0 · [log](sessions/s${i}.md)`;

test('notebook lives at .claude/noa/NOTEBOOK.md', () => {
  assert.equal(getIndexPath('/repo'), path.join('/repo', '.claude', 'noa', 'NOTEBOOK.md'));
});

test('missing notebook reads as empty', () => withNotebook(null, (cwd) => {
  assert.equal(readNotebook({ cwd }), '');
}));

test('headings, blanks and BOM are dropped; entries kept in order', () => withNotebook(
  '﻿# Noa\'s notebook\n\n' + entry(1) + '\r\n' + entry(2) + '\n\n', (cwd) => {
    assert.equal(readNotebook({ cwd }), entry(1) + '\n' + entry(2));
  }));

test('only the last maxLines entries are returned', () => withNotebook(
  Array.from({ length: 30 }, (_, i) => entry(i + 1)).join('\n'), (cwd) => {
    const out = readNotebook({ cwd, maxLines: 5 }).split('\n');
    assert.equal(out.length, 5);
    assert.equal(out[0], entry(26));
    assert.equal(out[4], entry(30));
    assert.equal(readNotebook({ cwd }).split('\n').length, 20, 'default is 20 lines');
  }));

test('byte cap drops the oldest lines first', () => withNotebook(
  Array.from({ length: 10 }, (_, i) => entry(i + 1)).join('\n'), (cwd) => {
    const out = readNotebook({ cwd, maxBytes: 250 });
    assert.ok(Buffer.byteLength(out) <= 250);
    assert.ok(out.endsWith(entry(10)), 'newest entry survives');
    assert.ok(!out.includes(entry(1)), 'oldest entry dropped');
  }));
