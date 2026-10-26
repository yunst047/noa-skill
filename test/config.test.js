const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { tmpDir, rm } = require('./helpers');
const config = require('../hooks/noa-config');

function withEnv(vars, fn) {
  const saved = {};
  for (const [k, v] of Object.entries(vars)) {
    saved[k] = process.env[k];
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  try { return fn(); }
  finally {
    for (const [k, v] of Object.entries(saved)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  }
}

test('Noa aliases map onto engine modes', () => {
  assert.equal(config.normalizeMode('memo'), 'lite');
  assert.equal(config.normalizeMode('notebook'), 'full');
  assert.equal(config.normalizeMode('verbatim'), 'ultra');
  assert.equal(config.normalizeMode('  NOTEBOOK '), 'full');
  assert.equal(config.normalizeMode('full'), 'full');
  assert.equal(config.normalizeMode('off'), 'off');
});

test('unknown or non-string modes normalize to null', () => {
  assert.equal(config.normalizeMode('ledger'), null);
  assert.equal(config.normalizeMode(''), null);
  assert.equal(config.normalizeMode(undefined), null);
  assert.equal(config.normalizeMode(42), null);
});

test('recap and compare are config-valid but not runtime levels', () => {
  assert.equal(config.normalizeMode('recap'), null);
  assert.equal(config.normalizeConfigMode('recap'), 'recap');
  assert.equal(config.normalizeConfigMode('compare'), 'compare');
  assert.equal(config.normalizePersistedMode('compare'), 'compare');
  assert.equal(config.normalizePersistedMode('verbatim'), 'ultra');
});

test('default mode is notebook (full) with no env or config', () => {
  const dir = tmpDir();
  try {
    withEnv({ NOA_DEFAULT_MODE: undefined, XDG_CONFIG_HOME: dir }, () => {
      assert.equal(config.DEFAULT_MODE, 'full');
      assert.equal(config.getDefaultMode(), 'full');
    });
  } finally { rm(dir); }
});

test('env var beats config file, config file beats default', () => {
  const dir = tmpDir();
  try {
    withEnv({ NOA_DEFAULT_MODE: undefined, XDG_CONFIG_HOME: dir }, () => {
      assert.equal(config.getConfigPath(), path.join(dir, 'noa', 'config.json'));
      assert.equal(config.writeDefaultMode('memo'), 'lite');
      assert.deepEqual(JSON.parse(fs.readFileSync(config.getConfigPath(), 'utf8')), { defaultMode: 'lite' });
      assert.equal(config.getDefaultMode(), 'lite');

      process.env.NOA_DEFAULT_MODE = 'verbatim';
      assert.equal(config.getDefaultMode(), 'ultra');

      process.env.NOA_DEFAULT_MODE = 'garbage';
      assert.equal(config.getDefaultMode(), 'lite');
    });
  } finally { rm(dir); }
});

test('writeDefaultMode rejects unknown modes without writing', () => {
  const dir = tmpDir();
  try {
    withEnv({ XDG_CONFIG_HOME: dir }, () => {
      assert.equal(config.writeDefaultMode('nope'), null);
      assert.equal(fs.existsSync(config.getConfigPath()), false);
    });
  } finally { rm(dir); }
});

test('CLAUDE_CONFIG_DIR overrides ~/.claude', () => {
  withEnv({ CLAUDE_CONFIG_DIR: '/x/claude' }, () => {
    assert.equal(config.getClaudeDir(), '/x/claude');
  });
});
