// Content lint — the skill files are the product, so their shape is tested too.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { ROOT } = require('./helpers');

const read = (...p) => fs.readFileSync(path.join(ROOT, ...p), 'utf8');

function frontmatter(text) {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return null;
  const fm = {};
  let key = null;
  for (const line of m[1].split(/\r?\n/)) {
    const kv = line.match(/^([\w-]+):\s*(.*)$/);
    if (kv) { key = kv[1]; fm[key] = kv[2].replace(/^>\s*$/, ''); }
    else if (key && /^\s+\S/.test(line)) fm[key] = (fm[key] + ' ' + line.trim()).trim();
  }
  return fm;
}

const SKILLS = ['noa', 'noa-recap', 'noa-compare', 'noa-save', 'noa-recall'];
const COMMANDS = ['noa', 'noa-recap', 'noa-compare', 'noa-save', 'noa-recall', 'noa-help'];

test('every skill has name == folder and a real description', () => {
  const dirs = fs.readdirSync(path.join(ROOT, 'skills')).sort();
  assert.deepEqual(dirs, [...SKILLS].sort());
  for (const s of SKILLS) {
    const fm = frontmatter(read('skills', s, 'SKILL.md'));
    assert.ok(fm, s + ' has frontmatter');
    assert.equal(fm.name, s);
    assert.ok(fm.description && fm.description.length > 80, s + ' description');
    assert.ok(fm.description.length <= 1024, s + ' description <= 1024 chars');
  }
});

test('every command has a description', () => {
  const files = fs.readdirSync(path.join(ROOT, 'commands')).sort();
  assert.deepEqual(files, COMMANDS.map((c) => c + '.md').sort());
  for (const c of COMMANDS) {
    const fm = frontmatter(read('commands', c + '.md'));
    assert.ok(fm && fm.description, c);
  }
});

test('main skill carries the full ruleset', () => {
  const skill = read('skills', 'noa', 'SKILL.md');
  for (const needle of [
    /sensei/, /feminine/i, /fufu/i, /📓/,
    /done:/, /✓ succeeded:/, /✗ failed:/, /~ unverified:/, /compare:/, /lesson:/, /save\?:/, /filed:/,
    /\| approach \| pro \| con \| outcome \|/,
    /No consent, no write/, /## Never/, /redact/i, /absolute date/i, /secrets/i,
    /\.claude\/noa\/sessions\//, /\.claude\/noa\/NOTEBOOK\.md/, /MEMORY\.md/,
    /Yuuka/, /Koyuki/, /Rio/, /Co-op with Koyuki and Yuuka/,
  ]) assert.match(skill, needle);
});

test('main skill links the entry-format reference, which has every template', () => {
  const skill = read('skills', 'noa', 'SKILL.md');
  assert.ok(skill.includes('(references/entry-format.md)'));
  const ref = read('skills', 'noa', 'references', 'entry-format.md');
  for (const h of ['## Session log', '## Notebook index line', '## Durable lesson → host memory',
    '## What is a good candidate', '## Redaction']) assert.ok(ref.includes(h), h);
});

test('mode-keyed bullets exist only for the three levels', () => {
  // filterSkillBodyForMode drops any "- <mode>: ..." bullet that isn't the
  // active level, so a rule written as "- off: ..." or "- full: ..." would vanish.
  const { normalizeMode } = require('../hooks/noa-config');
  const skill = read('skills', 'noa', 'SKILL.md');
  const keyed = skill.split(/\r?\n/)
    .map((l) => (l.match(/^-\s*([^:]+):\s*/) || [])[1])
    .filter((label) => label && normalizeMode(label.trim()));
  assert.deepEqual(keyed.sort(), ['memo', 'notebook', 'verbatim']);
});

test('AGENTS.md is a self-contained portable ruleset', () => {
  const agents = read('AGENTS.md');
  for (const needle of [/sensei/, /feminine/i, /Recall/, /✓ succeeded/, /✗ failed/, /~ unverified/,
    /pro \| con/, /No consent, no write/, /\.claude\/noa\//, /Never/, /Redact/i, /Koyuki/, /Yuuka/]) {
    assert.match(agents, needle);
  }
  assert.ok(Buffer.byteLength(agents) < 8000, 'AGENTS.md stays compact');
});

test('README images point at assets that exist, and each asset is credited', () => {
  const readme = read('README.md');
  const local = [...readme.matchAll(/<img src="(assets\/[^"]+)"/g)].map((m) => m[1]);
  assert.ok(local.includes('assets/noa-hero.png'), 'hero image is in the README');
  const credits = read('assets', 'README.md');
  for (const rel of local) {
    assert.ok(fs.existsSync(path.join(ROOT, rel)), rel);
    assert.ok(credits.includes(path.basename(rel)), rel + ' credited in assets/README.md');
  }
});

test('plugin manifests are valid and consistent', () => {
  const plugin = JSON.parse(read('.claude-plugin', 'plugin.json'));
  const market = JSON.parse(read('.claude-plugin', 'marketplace.json'));
  const pkg = JSON.parse(read('package.json'));
  assert.equal(plugin.name, 'noa');
  assert.equal(market.name, 'noa');
  assert.equal(market.plugins[0].name, 'noa');
  assert.equal(market.plugins[0].source, './');
  assert.equal(pkg.version, plugin.version);
});

test('hooks.json points only at scripts that exist', () => {
  const hooks = JSON.parse(read('hooks', 'hooks.json')).hooks;
  assert.deepEqual(Object.keys(hooks).sort(), ['SessionStart', 'UserPromptSubmit']);
  for (const entries of Object.values(hooks)) {
    for (const h of entries.flatMap((e) => e.hooks)) {
      for (const cmd of [h.command, h.commandWindows]) {
        const script = cmd.match(/hooks[\\/]+([\w-]+\.js)/)[1];
        assert.ok(fs.existsSync(path.join(ROOT, 'hooks', script)), script);
      }
    }
  }
});
