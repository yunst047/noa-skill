#!/usr/bin/env node
// noa — shared configuration resolver
//
// Resolution order for default mode:
//   1. NOA_DEFAULT_MODE environment variable
//   2. Config file defaultMode field:
//      - $XDG_CONFIG_HOME/noa/config.json (any platform, if set)
//      - ~/.config/noa/config.json (macOS / Linux fallback)
//      - %APPDATA%\noa\config.json (Windows fallback)
//   3. 'full'
//
// Engine modes are lite/full/ultra/off. The Noa-flavoured aliases
// memo/notebook/verbatim map onto them (see noa-mode-tracker.js).

const fs = require('fs');
const path = require('path');
const os = require('os');

const DEFAULT_MODE = 'full';
const VALID_MODES = ['off', 'lite', 'full', 'ultra', 'recap', 'compare'];
const RUNTIME_MODES = ['off', 'lite', 'full', 'ultra'];

// Friendly Noa names -> engine modes.
const ALIASES = {
  memo: 'lite',
  notebook: 'full',
  verbatim: 'ultra',
};

function resolveAlias(mode) {
  if (typeof mode !== 'string') return null;
  const m = mode.trim().toLowerCase();
  return ALIASES[m] || m;
}

function normalizeMode(mode) {
  const normalized = resolveAlias(mode);
  return RUNTIME_MODES.includes(normalized) ? normalized : null;
}

function normalizeConfigMode(mode) {
  const normalized = resolveAlias(mode);
  return VALID_MODES.includes(normalized) ? normalized : null;
}

function normalizePersistedMode(mode) {
  return normalizeMode(mode) || normalizeConfigMode(mode);
}

function getConfigDir() {
  if (process.env.XDG_CONFIG_HOME) {
    return path.join(process.env.XDG_CONFIG_HOME, 'noa');
  }
  if (process.platform === 'win32') {
    return path.join(
      process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming'),
      'noa'
    );
  }
  return path.join(os.homedir(), '.config', 'noa');
}

function getConfigPath() {
  return path.join(getConfigDir(), 'config.json');
}

function getClaudeDir() {
  // noa: CLAUDE_CONFIG_DIR overrides ~/.claude, matching Claude Code.
  return process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude');
}

function getDefaultMode() {
  // 1. Environment variable (highest priority)
  const envMode = normalizeConfigMode(process.env.NOA_DEFAULT_MODE);
  if (envMode) return envMode;

  // 2. Config file
  try {
    const config = JSON.parse(fs.readFileSync(getConfigPath(), 'utf8'));
    const fileMode = normalizeConfigMode(config.defaultMode);
    if (fileMode) return fileMode;
  } catch (e) {
    // Config file doesn't exist or is invalid — fall through
  }

  // 3. Default
  return DEFAULT_MODE;
}

function writeDefaultMode(mode) {
  const normalized = normalizeConfigMode(mode);
  if (!normalized) return null;

  const configPath = getConfigPath();
  fs.mkdirSync(path.dirname(configPath), { recursive: true });
  fs.writeFileSync(configPath, JSON.stringify({ defaultMode: normalized }, null, 2), 'utf8');
  return normalized;
}

module.exports = {
  DEFAULT_MODE,
  VALID_MODES,
  RUNTIME_MODES,
  ALIASES,
  getDefaultMode,
  getConfigDir,
  getConfigPath,
  getClaudeDir,
  normalizeMode,
  normalizeConfigMode,
  normalizePersistedMode,
  writeDefaultMode,
};
