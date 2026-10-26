const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { ROOT, tmpDir, rm, isolatedEnv, runHook, readFlag } = require('./helpers');

function sandbox(fn) {
  const claudeDir = tmpDir();
  const cwd = tmpDir();
  try { return fn({ claudeDir, cwd }); }
  finally { rm(claudeDir); rm(cwd); }
}

const prompt = (p) => JSON.stringify({ prompt: p });

function writeNotebook(cwd, text) {
  const dir = path.join(cwd, '.claude', 'noa');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'NOTEBOOK.md'), text);
}

// --- SessionStart activation -------------------------------------------------

test('activate: default notebook ruleset, flag written, statusline nudge', () => sandbox(({ claudeDir, cwd }) => {
  const r = runHook('noa-activate.js', { claudeDir, cwd });
  assert.equal(r.status, 0, r.stderr);
  assert.ok(r.stdout.startsWith('NOA MODE ACTIVE — level: notebook (full)'));
  assert.match(r.stdout, /STATUSLINE SETUP NEEDED/);
  assert.match(r.stdout, /noa-statusline/);
  assert.doesNotMatch(r.stdout, /CO-OP WITH/);
  assert.doesNotMatch(r.stdout, /NOA'S NOTEBOOK/);
  assert.equal(readFlag(claudeDir), 'full');
}));

test('activate: NOA_DEFAULT_MODE=verbatim emits the verbatim row only', () => sandbox(({ claudeDir, cwd }) => {
  const r = runHook('noa-activate.js', { claudeDir, cwd, env: { NOA_DEFAULT_MODE: 'verbatim' } });
  assert.match(r.stdout, /level: verbatim \(ultra\)/);
  assert.match(r.stdout, /\| \*\*verbatim\*\* \|/);
  assert.doesNotMatch(r.stdout, /\| \*\*notebook\*\* \|/);
  assert.equal(readFlag(claudeDir), 'ultra');
}));

test('activate: off mode writes no flag and no rules', () => sandbox(({ claudeDir, cwd }) => {
  fs.writeFileSync(path.join(claudeDir, '.noa-active'), 'full');
  const r = runHook('noa-activate.js', { claudeDir, cwd, env: { NOA_DEFAULT_MODE: 'off' } });
  assert.equal(r.stdout, 'OK');
  assert.equal(readFlag(claudeDir), null);
}));

test('activate: existing statusLine suppresses the nudge', () => sandbox(({ claudeDir, cwd }) => {
  fs.writeFileSync(path.join(claudeDir, 'settings.json'),
    JSON.stringify({ statusLine: { type: 'command', command: 'x' } }));
  const r = runHook('noa-activate.js', { claudeDir, cwd });
  assert.doesNotMatch(r.stdout, /STATUSLINE SETUP NEEDED/);
}));

test('activate: Koyuki and Yuuka flags add the co-op block', () => sandbox(({ claudeDir, cwd }) => {
  fs.writeFileSync(path.join(claudeDir, '.koyuki-active'), 'full');
  let r = runHook('noa-activate.js', { claudeDir, cwd });
  assert.match(r.stdout, /CO-OP WITH KOYUKI \(/);

  fs.writeFileSync(path.join(claudeDir, '.yuuka-active'), 'full');
  r = runHook('noa-activate.js', { claudeDir, cwd });
  assert.match(r.stdout, /CO-OP WITH KOYUKI \+ YUUKA/);
  assert.match(r.stdout, /nihaha/);
  assert.match(r.stdout, /ledger/);
}));

test('activate: project-level Yuuka install adds the co-op block', () => sandbox(({ claudeDir, cwd }) => {
  fs.mkdirSync(path.join(cwd, '.claude', 'skills', 'yuuka'), { recursive: true });
  const r = runHook('noa-activate.js', { claudeDir, cwd });
  assert.match(r.stdout, /CO-OP WITH YUUKA/);
}));

test('activate: the project notebook tail is injected', () => sandbox(({ claudeDir, cwd }) => {
  writeNotebook(cwd, "# Noa's notebook\n\n- 2026-10-25 · auth refactor · ✓2 ✗1 ~0 · lesson: tokens are per-tenant\n");
  const r = runHook('noa-activate.js', { claudeDir, cwd });
  assert.match(r.stdout, /## NOA'S NOTEBOOK/);
  assert.match(r.stdout, /auth refactor · ✓2 ✗1/);
  assert.doesNotMatch(r.stdout, /# Noa's notebook/);
}));

test('activate: a huge notebook is capped', () => sandbox(({ claudeDir, cwd }) => {
  writeNotebook(cwd, Array.from({ length: 500 }, (_, i) => `- entry ${i} ` + 'x'.repeat(150)).join('\n'));
  const r = runHook('noa-activate.js', { claudeDir, cwd });
  const block = r.stdout.split("## NOA'S NOTEBOOK")[1];
  assert.ok(block, 'notebook block present');
  assert.match(block, /entry 499/);
  assert.doesNotMatch(block, /entry 0 /);
  assert.ok(Buffer.byteLength(block) < 5000, 'notebook block stays small');
}));

// --- UserPromptSubmit mode tracker -------------------------------------------

test('tracker: /noa <alias> switches level', () => sandbox(({ claudeDir }) => {
  const r = runHook('noa-mode-tracker.js', { claudeDir, input: prompt('/noa memo') });
  assert.equal(readFlag(claudeDir), 'lite');
  assert.match(r.stdout, /NOA MODE CHANGED — level: memo/);

  runHook('noa-mode-tracker.js', { claudeDir, input: prompt('/noa verbatim') });
  assert.equal(readFlag(claudeDir), 'ultra');
}));

test('tracker: bare /noa uses the default level', () => sandbox(({ claudeDir }) => {
  runHook('noa-mode-tracker.js', { claudeDir, input: prompt('/noa') });
  assert.equal(readFlag(claudeDir), 'full');
}));

test('tracker: /noa-recap and /noa-compare are independent modes', () => sandbox(({ claudeDir }) => {
  runHook('noa-mode-tracker.js', { claudeDir, input: prompt('/noa-recap just the auth work') });
  assert.equal(readFlag(claudeDir), 'recap');
  runHook('noa-mode-tracker.js', { claudeDir, input: prompt('/noa:noa-compare redis vs lru') });
  assert.equal(readFlag(claudeDir), 'compare');
}));

test('tracker: one-shot commands and look-alike words leave the level alone', () => sandbox(({ claudeDir }) => {
  fs.writeFileSync(path.join(claudeDir, '.noa-active'), 'lite');
  for (const p of ['/noa-help', '/noa-save 1,3', '/noa-recall redis', '/noah hello', '/noan', 'just a normal prompt']) {
    runHook('noa-mode-tracker.js', { claudeDir, input: prompt(p) });
    assert.equal(readFlag(claudeDir), 'lite', p);
  }
}));

test('tracker: /noa off, "stop noa" and "normal mode" deactivate', () => sandbox(({ claudeDir }) => {
  for (const p of ['/noa off', 'ok please stop noa now', 'back to Normal Mode']) {
    fs.writeFileSync(path.join(claudeDir, '.noa-active'), 'full');
    const r = runHook('noa-mode-tracker.js', { claudeDir, input: prompt(p) });
    assert.equal(readFlag(claudeDir), null, p);
    assert.match(r.stdout, /NOA MODE OFF/);
  }
}));

test('tracker: survives a BOM and garbage input', () => sandbox(({ claudeDir }) => {
  runHook('noa-mode-tracker.js', { claudeDir, input: '﻿' + prompt('/noa notebook') });
  assert.equal(readFlag(claudeDir), 'full');

  const r = runHook('noa-mode-tracker.js', { claudeDir, input: '{ not json' });
  assert.equal(r.status, 0);
  assert.equal(r.stdout, '');
}));

test('codex host: JSON hook output with a system badge', () => sandbox(({ claudeDir }) => {
  const r = runHook('noa-mode-tracker.js', {
    claudeDir, input: prompt('/noa verbatim'), env: { PLUGIN_DATA: claudeDir },
  });
  const out = JSON.parse(r.stdout);
  assert.equal(out.systemMessage, 'NOA:ULTRA');
  assert.equal(out.hookSpecificOutput.hookEventName, 'UserPromptSubmit');
}));

// --- statusline ----------------------------------------------------------------

function statusline(claudeDir) {
  if (process.platform === 'win32') {
    return spawnSync('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File',
      path.join(ROOT, 'hooks', 'noa-statusline.ps1')],
    { env: isolatedEnv(claudeDir), encoding: 'utf8' }).stdout.trim();
  }
  return spawnSync('bash', [path.join(ROOT, 'hooks', 'noa-statusline.sh')],
    { env: isolatedEnv(claudeDir), encoding: 'utf8' }).stdout.trim();
}

test('statusline: solo, with sisters, and empty', () => sandbox(({ claudeDir }) => {
  const flag = (name, mode) => fs.writeFileSync(path.join(claudeDir, `.${name}-active`), mode);
  assert.equal(statusline(claudeDir), '');

  flag('noa', 'full');
  assert.equal(statusline(claudeDir), '[NOA:NOTEBOOK]');

  flag('yuuka', 'full');
  assert.equal(statusline(claudeDir), '[NOA:NOTEBOOK|YUUKA:LEDGER]');

  flag('koyuki', 'ultra');
  flag('noa', 'recap');
  assert.equal(statusline(claudeDir), '[NOA:RECAP|YUUKA:LEDGER|KOYUKI:NIHAHAHACK]');

  fs.unlinkSync(path.join(claudeDir, '.noa-active'));
  assert.equal(statusline(claudeDir), '[YUUKA:LEDGER|KOYUKI:NIHAHAHACK]');
}));
