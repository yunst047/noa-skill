const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { ROOT, tmpDir, rm } = require('./helpers');

const INSTALLER = path.join(ROOT, 'bin', 'noa-install.js');

function install(target, ...flags) {
  return spawnSync(process.execPath, [INSTALLER, target, ...flags], { encoding: 'utf8' });
}

function settings(target) {
  return JSON.parse(fs.readFileSync(path.join(target, '.claude', 'settings.json'), 'utf8'));
}

function write(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}

test('installer: copies skills/commands and wires both hooks', () => {
  const target = tmpDir();
  try {
    const r = install(target);
    assert.equal(r.status, 0, r.stderr);
    assert.ok(fs.existsSync(path.join(target, '.claude', 'skills', 'noa', 'SKILL.md')));
    assert.ok(fs.existsSync(path.join(target, '.claude', 'skills', 'noa', 'references', 'entry-format.md')));
    assert.ok(fs.existsSync(path.join(target, '.claude', 'skills', 'noa-recap', 'SKILL.md')));
    assert.ok(fs.existsSync(path.join(target, '.claude', 'commands', 'noa-save.md')));

    const s = settings(target);
    assert.equal(s.hooks.SessionStart.length, 1);
    assert.equal(s.hooks.UserPromptSubmit.length, 1);
    assert.match(s.hooks.SessionStart[0].hooks[0].command, /noa-activate\.js/);
    assert.match(s.hooks.UserPromptSubmit[0].hooks[0].command, /noa-mode-tracker\.js/);
  } finally { rm(target); }
});

test('installer: idempotent and never clobbers unrelated settings', () => {
  const target = tmpDir();
  try {
    fs.mkdirSync(path.join(target, '.claude'));
    const theirs = { type: 'command', command: 'echo theirs' };
    fs.writeFileSync(path.join(target, '.claude', 'settings.json'), JSON.stringify({
      model: 'opus',
      hooks: { SessionStart: [{ hooks: [theirs] }] },
    }));

    install(target);
    install(target);
    const s = settings(target);
    assert.equal(s.model, 'opus');
    assert.equal(s.hooks.SessionStart.length, 2);
    assert.deepEqual(s.hooks.SessionStart[0].hooks[0], theirs);
    assert.equal(s.hooks.UserPromptSubmit.length, 1);
  } finally { rm(target); }
});

test('installer: uninstall removes only what it added', () => {
  const target = tmpDir();
  try {
    fs.mkdirSync(path.join(target, '.claude'));
    fs.writeFileSync(path.join(target, '.claude', 'settings.json'), JSON.stringify({ model: 'opus' }));
    install(target);
    const r = install(target, '-u');
    assert.equal(r.status, 0, r.stderr);
    assert.deepEqual(settings(target), { model: 'opus' });
    assert.equal(fs.existsSync(path.join(target, '.claude', 'skills', 'noa')), false);
    assert.equal(fs.existsSync(path.join(target, '.claude', 'commands', 'noa.md')), false);
  } finally { rm(target); }
});

test("installer: sensei's notebook survives install and uninstall", () => {
  const target = tmpDir();
  try {
    const index = path.join(target, '.claude', 'noa', 'NOTEBOOK.md');
    const log = path.join(target, '.claude', 'noa', 'sessions', '2026-10-26-x.md');
    write(index, '- 2026-10-26 · x');
    write(log, '# x');

    install(target);
    install(target, '-u');
    assert.equal(fs.readFileSync(index, 'utf8'), '- 2026-10-26 · x');
    assert.equal(fs.readFileSync(log, 'utf8'), '# x');
  } finally { rm(target); }
});

test('installer: leaves co-installed Koyuki and Yuuka untouched', () => {
  const target = tmpDir();
  try {
    const files = ['skills/koyuki/SKILL.md', 'skills/yuuka/SKILL.md', 'commands/koyuki.md', 'commands/yuuka-audit.md']
      .map((p) => path.join(target, '.claude', p));
    for (const f of files) write(f, 'sister');
    const sisterHooks = [
      { hooks: [{ type: 'command', command: 'node "/x/hooks/koyuki-activate.js"' }] },
      { hooks: [{ type: 'command', command: 'node "/x/hooks/yuuka-activate.js"' }] },
    ];
    fs.writeFileSync(path.join(target, '.claude', 'settings.json'),
      JSON.stringify({ hooks: { SessionStart: sisterHooks } }));

    install(target);
    assert.equal(settings(target).hooks.SessionStart.length, 3);

    install(target, '-u');
    for (const f of files) assert.equal(fs.readFileSync(f, 'utf8'), 'sister', f);
    assert.deepEqual(settings(target).hooks.SessionStart, sisterHooks);
  } finally { rm(target); }
});

test('installer: rejects a missing target dir', () => {
  const r = install(path.join(ROOT, 'does-not-exist-' + Date.now()));
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /not a directory/);
});
