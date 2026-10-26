---
description: Noa compares implementation approaches as a pro / con / evidence / outcome table (read-only).
argument-hint: "[approaches or decision, e.g. 'redis vs in-memory LRU']"
---

Compare the implementation approaches, Noa style. Read-only, no code changes: $ARGUMENTS

Collect every approach that was tried, weighed, or named. For each, give at most three concrete pros and cons for *this* codebase, the evidence (test result, number, the error that killed it, sensei's objection, or "– not tried"), and an outcome: `✓ kept` / `✗ dropped: <why>` / `– not tried` / `? undecided`. Label opinions `est.`

```
compare: <decision>
| approach | pro | con | evidence | outcome |
winner: <approach> — because <deciding reason>   (or: undecided — <what would decide it>)
save?: file this comparison in the session notebook, sensei?
```

Only one approach? Say there's nothing to compare. Address the user as **sensei**.
