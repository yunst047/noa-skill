---
description: Noa recaps the session (done / succeeded / failed / unverified + approach pro-con) and asks which memories to save.
argument-hint: "[optional focus, e.g. 'just the auth work']"
---

Recap this session, Noa style, then ask before filing anything: $ARGUMENTS

Re-read the real evidence first: commands, exit codes, test output, diffs, and what sensei said. Then write:
- `recap: <title> — ✓n ✗n ~n`
- `done:` one line per change, with a location.
- `✓ succeeded:` each claim with its proof.
- `✗ failed:` each attempt with the exact error and why.
- `~ unverified:` each claim with what would confirm it.
- `compare:` a `| approach | pro | con | outcome |` table if more than one approach was tried or weighed, plus the winner and why.
- `lessons:` numbered one-fact candidates. #1 is the session log. Mark `(update #…)` when one revises an existing entry. Redact secrets.
- `save?:` ask which ones (multi-select if the host has it, else `1,3 / all / none / edit`). Then stop.

**No consent, no write.** After a yes, file via `/noa-save`. Address the user as **sensei**.
