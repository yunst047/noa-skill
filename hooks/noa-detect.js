#!/usr/bin/env node
// noa — detect co-installed Seminar sisters so Noa can keep their records
// instead of talking over them:
//   Koyuki  yunst047/niha-skills   (owns broken — the crack ladder)
//   Yuuka   yunst047/yuuka-skill   (owns cost — the kanpeki ledger)
//
// Best-effort, any hit counts:
//   flag            <claudeDir>/.<name>-active (their hooks write it; content = mode)
//   installed_plugins / known_marketplaces   <claudeDir>/plugins/*.json mentioning <name>
//   plugin_cache    <claudeDir>/plugins/{cache,marketplaces}/<name>
//   user_skill      <claudeDir>/skills/<name>
//   project_skill   <cwd>/.claude/skills/<name> (<name>-install into a repo)

const fs = require('fs');
const path = require('path');
const { getClaudeDir } = require('./noa-config');

const KOYUKI_MODES = ['lite', 'full', 'ultra', 'crack'];
const YUUKA_MODES = ['lite', 'full', 'ultra', 'audit', 'bench'];

function exists(p) {
  try { fs.accessSync(p); return true; } catch (e) { return false; }
}

function jsonMentions(file, re) {
  try {
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    return re.test(JSON.stringify(data));
  } catch (e) {
    return false;
  }
}

function detectPersona(name, modes, { claudeDir = getClaudeDir(), cwd = process.cwd() } = {}) {
  const sources = [];
  let active = null;
  const re = new RegExp(name, 'i');

  const flag = path.join(claudeDir, '.' + name + '-active');
  if (exists(flag)) {
    sources.push('flag');
    try {
      const mode = fs.readFileSync(flag, 'utf8').trim().toLowerCase();
      if (modes.includes(mode)) active = mode;
    } catch (e) {}
  }

  const plugins = path.join(claudeDir, 'plugins');
  if (jsonMentions(path.join(plugins, 'installed_plugins.json'), re)) sources.push('installed_plugins');
  if (jsonMentions(path.join(plugins, 'known_marketplaces.json'), re)) sources.push('known_marketplaces');
  if (exists(path.join(plugins, 'cache', name)) || exists(path.join(plugins, 'marketplaces', name))) {
    sources.push('plugin_cache');
  }
  if (exists(path.join(claudeDir, 'skills', name))) sources.push('user_skill');
  if (exists(path.join(cwd, '.claude', 'skills', name))) sources.push('project_skill');

  return { found: sources.length > 0, active, sources };
}

const detectKoyuki = (opts) => detectPersona('koyuki', KOYUKI_MODES, opts);
const detectYuuka = (opts) => detectPersona('yuuka', YUUKA_MODES, opts);

module.exports = { detectPersona, detectKoyuki, detectYuuka, KOYUKI_MODES, YUUKA_MODES };
