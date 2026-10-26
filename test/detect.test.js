const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { tmpDir, rm } = require('./helpers');
const { detectKoyuki, detectYuuka } = require('../hooks/noa-detect');

function sandbox(fn) {
  const claudeDir = tmpDir();
  const cwd = tmpDir();
  try { return fn({ claudeDir, cwd }); }
  finally { rm(claudeDir); rm(cwd); }
}

function write(file, content = '') {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}

const SISTERS = [
  { name: 'koyuki', detect: detectKoyuki, activeMode: 'ultra', foreignMode: 'bench' },
  { name: 'yuuka', detect: detectYuuka, activeMode: 'bench', foreignMode: 'crack' },
];

for (const { name, detect, activeMode, foreignMode } of SISTERS) {
  test(`${name}: nothing anywhere -> not found`, () => sandbox(({ claudeDir, cwd }) => {
    assert.deepEqual(detect({ claudeDir, cwd }), { found: false, active: null, sources: [] });
  }));

  test(`${name}: active flag -> found with her current mode`, () => sandbox(({ claudeDir, cwd }) => {
    write(path.join(claudeDir, `.${name}-active`), activeMode + '\n');
    const r = detect({ claudeDir, cwd });
    assert.equal(r.found, true);
    assert.equal(r.active, activeMode);
    assert.ok(r.sources.includes('flag'));
  }));

  test(`${name}: a mode she doesn't have is installed, not active`, () => sandbox(({ claudeDir, cwd }) => {
    write(path.join(claudeDir, `.${name}-active`), foreignMode);
    const r = detect({ claudeDir, cwd });
    assert.equal(r.found, true);
    assert.equal(r.active, null);
  }));

  test(`${name}: installed_plugins.json mention -> found, not active`, () => sandbox(({ claudeDir, cwd }) => {
    write(path.join(claudeDir, 'plugins', 'installed_plugins.json'),
      JSON.stringify({ plugins: { [`${name}@${name}`]: [{ scope: 'user' }] } }));
    const r = detect({ claudeDir, cwd });
    assert.equal(r.found, true);
    assert.equal(r.active, null);
    assert.ok(r.sources.includes('installed_plugins'));
  }));

  test(`${name}: plugin cache / marketplace dirs -> found`, () => sandbox(({ claudeDir, cwd }) => {
    fs.mkdirSync(path.join(claudeDir, 'plugins', 'marketplaces', name), { recursive: true });
    assert.ok(detect({ claudeDir, cwd }).sources.includes('plugin_cache'));
  }));

  test(`${name}: user- and project-level skills -> found`, () => sandbox(({ claudeDir, cwd }) => {
    write(path.join(claudeDir, 'skills', name, 'SKILL.md'), `---\nname: ${name}\n---\n`);
    write(path.join(cwd, '.claude', 'skills', name, 'SKILL.md'), `---\nname: ${name}\n---\n`);
    const r = detect({ claudeDir, cwd });
    assert.ok(r.sources.includes('user_skill'));
    assert.ok(r.sources.includes('project_skill'));
  }));
}

test('sisters are detected independently', () => sandbox(({ claudeDir, cwd }) => {
  write(path.join(claudeDir, '.yuuka-active'), 'full');
  assert.equal(detectYuuka({ claudeDir, cwd }).found, true);
  assert.equal(detectKoyuki({ claudeDir, cwd }).found, false);
}));

test('unrelated plugins and corrupt json do not count', () => sandbox(({ claudeDir, cwd }) => {
  write(path.join(claudeDir, 'plugins', 'installed_plugins.json'), '{ not json');
  write(path.join(claudeDir, 'plugins', 'known_marketplaces.json'), JSON.stringify({ ponytail: {} }));
  fs.mkdirSync(path.join(claudeDir, 'plugins', 'cache', 'ponytail'), { recursive: true });
  assert.equal(detectKoyuki({ claudeDir, cwd }).found, false);
  assert.equal(detectYuuka({ claudeDir, cwd }).found, false);
}));
