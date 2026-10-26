#!/usr/bin/env node
// noa — UserPromptSubmit hook to track which Noa mode is active.
// Inspects user input for /noa commands and writes the mode to the flag file.
// Accepts both engine names (lite/full/ultra/off) and the Noa aliases
// (memo/notebook/verbatim). /noa-recap and /noa-compare are independent
// modes; /noa-save, /noa-recall and /noa-help are one-shot and change nothing.

const { getDefaultMode, normalizeMode } = require('./noa-config');
const { clearMode, setMode, writeHookOutput } = require('./noa-runtime');

const LABEL = { lite: 'memo', full: 'notebook', ultra: 'verbatim' };
const INDEPENDENT = { '/noa-recap': 'recap', '/noa-compare': 'compare' };

let input = '';
process.stdin.on('data', chunk => { input += chunk; });
process.stdin.on('end', () => {
  try {
    // Strip UTF-8 BOM some shells prepend when piping (breaks JSON.parse)
    const data = JSON.parse(input.replace(/^﻿/, ''));
    const prompt = (data.prompt || '').trim().toLowerCase();

    // Match /noa commands (also @noa / $noa for Codex-style hosts), but not
    // words that merely start with "noa" (/noan, /noah ...).
    if (/^[/@$]noa(?=$|[\s:-])/.test(prompt)) {
      const parts = prompt.split(/\s+/);
      const cmd = parts[0].replace(/^[@$]/, '/').replace(/^\/noa:/, '/');
      const arg = parts[1] || '';

      let mode = null;

      if (INDEPENDENT[cmd]) {
        mode = INDEPENDENT[cmd];
      } else if (cmd === '/noa') {
        if (arg === 'off') mode = 'off';
        else mode = normalizeMode(arg) || getDefaultMode();
      }

      if (mode && mode !== 'off') {
        setMode(mode);
        writeHookOutput(
          'UserPromptSubmit',
          mode,
          'NOA MODE CHANGED — level: ' + (LABEL[mode] || mode),
        );
      } else if (mode === 'off') {
        clearMode();
        writeHookOutput('UserPromptSubmit', 'off', 'NOA MODE OFF');
      }
    }

    // Detect deactivation
    if (/\b(stop noa|normal mode)\b/i.test(prompt)) {
      clearMode();
      writeHookOutput('UserPromptSubmit', 'off', 'NOA MODE OFF');
    }
  } catch (e) {
    // Silent fail
  }
});
