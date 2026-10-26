---
name: noa-save
description: >
  Noa files the memories sensei approved — and only those. Writes the
  session log to .claude/noa/sessions/, appends one line to
  .claude/noa/NOTEBOOK.md, and puts durable lessons into the host's own
  memory system (Claude Code auto-memory) in its exact format, deduplicating
  and updating instead of duplicating. Redacts secrets, uses absolute dates,
  reports every path written. Use when the user says "save it", "remember
  this", "write that down", "file it", "noa-save", or invokes /noa-save.
---

File what sensei approved. Address the user as **sensei**.

## Method

1. **Confirm the approval.** Which numbered candidates did sensei approve? If `$ARGUMENTS` names something new (for example "remember that we use pnpm"), turn it into one candidate, show it, and treat this command itself as sensei's consent for exactly that text. If nothing has been approved yet, run the `/noa-recap` steps first and ask. **No consent, no write.**
2. **Prepare.** For each approved item:
   - redact secrets and private data;
   - convert relative dates to absolute ones;
   - one fact per memory entry.

   Follow `../noa/references/entry-format.md`.
3. **Dedupe.** Read the existing `.claude/noa/NOTEBOOK.md` and the host memory index.
   - If an entry already covers the fact, **update** it. When the change is substantive, show sensei the before → after first.
   - Never delete an entry unless sensei asked.
4. **Write.**
   - Session log → `.claude/noa/sessions/YYYY-MM-DD-<slug>.md`.
   - Index → append one line to `.claude/noa/NOTEBOOK.md`. Create the file with a `# Noa's notebook` heading if it's missing.
   - Durable lessons → the host memory directory and its index, in the host's format. If the host has no memory system, put them in a `## Lessons` section in the session log.
   - First filing in this repo: ask sensei once whether `.claude/noa/` should be committed or gitignored, and do what they say.
5. **Report.** `filed:` one line per path written, plus anything skipped and why.

## Output

```
filed: .claude/noa/sessions/2026-10-26-cache-layer.md (new)
filed: .claude/noa/NOTEBOOK.md (+1 line)
filed: <memory dir>/redis-expire-in-multi.md (new) + MEMORY.md (+1 line)
skipped: #4 — git history already records it
📓 fufu~ it's all in my notes, sensei.
```

## Boundaries

This command writes only what sensei approved, only under `.claude/noa/` and the host memory directory. It never touches code. It never commits or pushes unless sensei asks. "stop noa" or "normal mode" reverts.
