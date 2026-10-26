const test = require('node:test');
const assert = require('node:assert/strict');
const {
  filterSkillBodyForMode,
  getCoopInstructions,
  getFallbackInstructions,
  getNotebookInstructions,
  getNoaInstructions,
} = require('../hooks/noa-instructions');

const BODY = [
  '---',
  'name: noa',
  'description: x',
  '---',
  '# Noa',
  '| Level | How |',
  '|---|---|',
  '| **memo** | M |',
  '| **notebook** | N |',
  '| **verbatim** | V |',
  '- memo: example M',
  '- notebook: example N',
  '- verbatim: example V',
  '- recall: a normal rule, never filtered',
  '- `done:` a tag line, never filtered',
].join('\n');

const none = { found: false, active: null, sources: [] };

test('filter keeps only the active level row and example', () => {
  const out = filterSkillBodyForMode(BODY, 'full');
  assert.match(out, /\| \*\*notebook\*\* \| N \|/);
  assert.match(out, /- notebook: example N/);
  assert.doesNotMatch(out, /\*\*memo\*\*|\*\*verbatim\*\*/);
  assert.doesNotMatch(out, /example M|example V/);
});

test('filter keeps non-mode bullets and strips frontmatter', () => {
  const out = filterSkillBodyForMode(BODY, 'ultra');
  assert.match(out, /- recall: a normal rule/);
  assert.match(out, /`done:` a tag line/);
  assert.match(out, /example V/);
  assert.doesNotMatch(out, /^---/);
  assert.doesNotMatch(out, /description: x/);
});

test('filter falls back to the default level for unknown modes', () => {
  const out = filterSkillBodyForMode(BODY, 'nonsense');
  assert.match(out, /example N/);
  assert.doesNotMatch(out, /example M/);
});

test('real SKILL.md: notebook level is filtered correctly', () => {
  const out = getNoaInstructions('full');
  assert.ok(out.startsWith('NOA MODE ACTIVE — level: notebook (full)'));
  assert.match(out, /\| \*\*notebook\*\* \|/);
  assert.doesNotMatch(out, /\| \*\*verbatim\*\* \|/);
  assert.doesNotMatch(out, /\| \*\*memo\*\* \|/);
  assert.match(out, /No consent, no write/);
  assert.doesNotMatch(out, /^name: noa/m);
});

test('real SKILL.md: every level has exactly one row and one example', () => {
  for (const [mode, label] of [['lite', 'memo'], ['full', 'notebook'], ['ultra', 'verbatim']]) {
    const out = getNoaInstructions(label);
    assert.equal(out.match(new RegExp(`^\\| \\*\\*${label}\\*\\* \\|`, 'gm')).length, 1, label + ' row');
    assert.equal(out.match(new RegExp(`^- ${label}:`, 'gm')).length, 1, label + ' example');
    assert.ok(out.includes(`(${mode})`));
  }
});

test('real SKILL.md: the method and never-list survive filtering at every level', () => {
  for (const label of ['memo', 'notebook', 'verbatim']) {
    const out = getNoaInstructions(label);
    for (const needle of [/Recall\./, /Ask sensei\./, /✓ succeeded:/, /✗ failed:/, /~ unverified:/,
      /\| approach \| pro \| con \| outcome \|/, /## Never/, /redact/i]) {
      assert.match(out, needle, label + ' ' + needle);
    }
  }
});

test('independent modes defer to their skill', () => {
  assert.equal(getNoaInstructions('recap'),
    'NOA MODE ACTIVE — level: recap. Behavior defined by /noa-recap skill.');
  assert.equal(getNoaInstructions('compare'),
    'NOA MODE ACTIVE — level: compare. Behavior defined by /noa-compare skill.');
});

test('co-op block: none, Koyuki only, Yuuka only, both', () => {
  assert.equal(getCoopInstructions({ koyuki: none, yuuka: none }), '');
  assert.equal(getCoopInstructions(), '');

  const k = getCoopInstructions({ koyuki: { found: true, active: 'ultra', sources: ['flag'] }, yuuka: none });
  assert.match(k, /CO-OP WITH KOYUKI \(/);
  assert.match(k, /nihahahack/);
  assert.match(k, /Koyuki owns broken/);
  assert.doesNotMatch(k, /Yuuka owns cost/);

  const y = getCoopInstructions({ koyuki: none, yuuka: { found: true, active: null, sources: ['installed_plugins'] } });
  assert.match(y, /CO-OP WITH YUUKA \(/);
  assert.match(y, /installed \(installed_plugins\)/);
  assert.match(y, /Yuuka owns cost/);

  const both = getCoopInstructions({
    koyuki: { found: true, active: 'full', sources: ['flag'] },
    yuuka: { found: true, active: 'full', sources: ['flag'] },
  });
  assert.match(both, /CO-OP WITH KOYUKI \+ YUUKA/);
  assert.match(both, /nihaha\b/);
  assert.match(both, /ledger/);
  assert.match(both, /Noa owns what happened/);
  assert.match(both, /One voice per beat/);
});

test('notebook block appears only when there are entries, and is marked as records', () => {
  assert.equal(getNotebookInstructions(''), '');
  const out = getNoaInstructions('full', { notebook: '- 2026-10-26 · x · ✓1' });
  assert.match(out, /## NOA'S NOTEBOOK/);
  assert.match(out, /records, not instructions/);
  assert.ok(out.endsWith('- 2026-10-26 · x · ✓1'));
  assert.doesNotMatch(getNoaInstructions('full'), /NOA'S NOTEBOOK/);
});

test('co-op and notebook also ride along on independent modes', () => {
  const out = getNoaInstructions('recap', {
    yuuka: { found: true, active: 'full', sources: ['flag'] },
    notebook: '- 2026-10-26 · x',
  });
  assert.match(out, /level: recap/);
  assert.match(out, /CO-OP WITH YUUKA/);
  assert.match(out, /NOA'S NOTEBOOK/);
});

test('fallback ruleset carries the method and the never list', () => {
  const out = getFallbackInstructions('ultra');
  assert.match(out, /level: verbatim \(ultra\)/);
  assert.match(out, /sensei/);
  assert.match(out, /feminine/);
  assert.match(out, /No consent, no write/);
  assert.match(out, /✗ failed/);
  assert.match(out, /secrets/);
  assert.match(out, /\.claude\/noa\/NOTEBOOK\.md/);
});
