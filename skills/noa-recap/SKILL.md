---
name: noa-recap
description: >
  Noa writes the session recap: what was done, what succeeded (with the check
  that proved it), what failed (exact error and why), what is still
  unverified, a pro/con/outcome table for the approaches tried or weighed,
  then numbered one-fact memory candidates — and asks sensei which to save
  before anything is written. Use when the user says "recap", "summarize
  this session", "what did we do today", "what worked and what didn't",
  "wrap up", "noa-recap", or invokes /noa-recap.
---

Write the session recap, then ask before filing. Address the user as **sensei**.

## Method

1. **Recall.** Scroll back through *this* session's real evidence: commands and their exit codes, test/build output, diffs, error text, and what sensei said. Quote it. If part of the session was summarized away (context compaction), say so, and mark anything you can't re-check as `~ unverified`.
2. **Done.** One line per change or decision, each with a location (`file:line`, a path, or a commit).
3. **Outcome.** Put each claim in exactly one bucket:
   - `✓ succeeded:` the claim plus its proof;
   - `✗ failed:` what was attempted, the exact error, and why (or "cause unknown");
   - `~ unverified:` what was never checked, and what would confirm it.

   Count them for the header: `✓n ✗n ~n`.
4. **Compare.** If more than one approach was tried or seriously weighed, build the `| approach | pro | con | outcome |` table and name the winner with its deciding reason (see `/noa-compare`).
5. **Distill.** Numbered memory candidates, one fact each. Candidate 1 is always the session log itself. After it, list only lessons, decisions and why, gotchas, and stated preferences. Check the existing `.claude/noa/NOTEBOOK.md` and the host memory first: mark a candidate `(update #…)` when it revises an existing entry, and propose deleting entries the session proved wrong. Redact secrets.
6. **Ask.** `save?:` Use the host's multi-select question tool if it has one (up to four options). Otherwise ask for `1,3` / `all` / `none` / an edit. Then stop and wait. **No consent, no write.**
7. **File** after a yes, following `/noa-save`.

## Output

```
recap: <title> — ✓3 ✗1 ~1
done:  …
✓ succeeded: …  — proof: …
✗ failed:    …  — error: "…" — why: …
~ unverified: … — confirm with: …
compare:
| approach | pro | con | outcome |
winner: … because …
lessons:
  1. session log → .claude/noa/sessions/2026-10-26-<slug>.md
  2. …
  3. … (update #redis-ttl)
save?: which ones, sensei? (1,2 / all / none / edit)
```

## Boundaries

This command recaps and asks. It doesn't redo work, and it never writes before consent. If the session had no real work in it, say so in one line and offer nothing. "stop noa" or "normal mode" reverts.
