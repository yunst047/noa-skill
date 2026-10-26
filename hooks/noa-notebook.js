#!/usr/bin/env node
// noa — read-only access to the project notebook so Noa "remembers" the last
// sessions at SessionStart. The notebook is written by the agent (with
// sensei's consent), never by a hook:
//
//   <cwd>/.claude/noa/NOTEBOOK.md         one line per filed session (index)
//   <cwd>/.claude/noa/sessions/*.md       the full session logs
//
// Only the tail of the index is injected, capped by lines and bytes, so a
// long-lived notebook never bloats the context.

const fs = require('fs');
const path = require('path');

const NOTEBOOK_DIR = path.join('.claude', 'noa');
const INDEX_FILE = 'NOTEBOOK.md';

function getNotebookDir(cwd = process.cwd()) {
  return path.join(cwd, NOTEBOOK_DIR);
}

function getIndexPath(cwd = process.cwd()) {
  return path.join(getNotebookDir(cwd), INDEX_FILE);
}

function readNotebook({ cwd = process.cwd(), maxLines = 20, maxBytes = 4000 } = {}) {
  let text;
  try { text = fs.readFileSync(getIndexPath(cwd), 'utf8'); }
  catch (e) { return ''; }

  // Keep only entry lines; headings and blanks carry no memory.
  let lines = text.replace(/^﻿/, '').split(/\r?\n/)
    .filter((l) => l.trim() && !/^#/.test(l.trim()));
  lines = lines.slice(-maxLines);

  // Drop the oldest lines until the block fits the byte budget.
  while (lines.length && Buffer.byteLength(lines.join('\n')) > maxBytes) lines.shift();
  return lines.join('\n');
}

module.exports = { NOTEBOOK_DIR, INDEX_FILE, getNotebookDir, getIndexPath, readNotebook };
