#!/usr/bin/env node
// noa — Claude Code SessionStart activation hook
//
// Runs on every session start:
//   1. Writes flag file at ~/.claude/.noa-active (statusline reads this)
//   2. Emits the Noa persona ruleset as hidden SessionStart context, plus the
//      co-op contract if Koyuki / Yuuka are on the machine, plus the tail of
//      the project notebook (.claude/noa/NOTEBOOK.md) so Noa remembers
//   3. Detects missing statusline config and emits a setup nudge

const fs = require('fs');
const path = require('path');
const { getDefaultMode, getClaudeDir } = require('./noa-config');
const { detectKoyuki, detectYuuka } = require('./noa-detect');
const { getNoaInstructions } = require('./noa-instructions');
const { readNotebook } = require('./noa-notebook');
const {
  clearMode,
  isCodex,
  setMode,
  writeHookOutput,
} = require('./noa-runtime');

const claudeDir = getClaudeDir();
const settingsPath = path.join(claudeDir, 'settings.json');
const cwd = process.cwd();

const mode = getDefaultMode();

// "off" mode — skip activation entirely, don't write flag or emit rules
if (mode === 'off') {
  clearMode();
  writeHookOutput('SessionStart', 'off', isCodex ? '' : 'OK');
  process.exit(0);
}

// 1. Write flag file
try {
  setMode(mode);
} catch (e) {
  // Silent fail — flag is best-effort, don't block the hook
}

// 2. Emit the Noa ruleset, filtered to the active intensity level.
const none = { found: false, active: null, sources: [] };
let koyuki = none;
let yuuka = none;
let notebook = '';
try { koyuki = detectKoyuki({ claudeDir, cwd }); } catch (e) {}
try { yuuka = detectYuuka({ claudeDir, cwd }); } catch (e) {}
try { notebook = readNotebook({ cwd }); } catch (e) {}
// Silent fails above — co-op and recall are a bonus, never a blocker
let output = getNoaInstructions(mode, { koyuki, yuuka, notebook });

// 3. Detect missing statusline config — nudge Claude to help set it up
if (!isCodex) try {
  let hasStatusline = false;
  if (fs.existsSync(settingsPath)) {
    const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    if (settings.statusLine) hasStatusline = true;
  }

  if (!hasStatusline) {
    const isWindows = process.platform === 'win32';
    const scriptName = isWindows ? 'noa-statusline.ps1' : 'noa-statusline.sh';
    const scriptPath = path.join(__dirname, scriptName);
    const command = isWindows
      ? `powershell -ExecutionPolicy Bypass -File "${scriptPath}"`
      : `bash "${scriptPath}"`;
    const statusLineSnippet =
      '"statusLine": { "type": "command", "command": ' + JSON.stringify(command) + ' }';
    output += "\n\n" +
      "STATUSLINE SETUP NEEDED: The noa plugin includes a statusline badge showing the active mode " +
      "(e.g. [NOA:NOTEBOOK], or [NOA:NOTEBOOK|YUUKA:LEDGER|KOYUKI:NIHAHA] alongside her sisters). " +
      "It is not configured yet. To enable, add this to ~/.claude/settings.json: " +
      statusLineSnippet + " " +
      "Proactively offer to set this up for the user on first interaction.";
  }
} catch (e) {
  // Silent fail — don't block session start over statusline detection
}

writeHookOutput('SessionStart', mode, output);
