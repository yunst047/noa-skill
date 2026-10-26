# Noa's entry formats

Templates for everything Noa files. Write only what sensei approved.

## Session log

Path: `.claude/noa/sessions/YYYY-MM-DD-<slug>.md`. Use today's absolute date. The `<slug>` is 2–5 kebab-case words naming the work. If that name is taken the same day, add `-2`, `-3` and so on.

```markdown
---
date: 2026-10-26
title: Cache layer for /search
outcome: ✓3 ✗1 ~1
---

# Cache layer for /search

## Done
- Added src/cache.ts (Redis client wrapper, SET EX on write)
- Wired /search through the cache (src/routes/search.ts:31)

## Outcome
- ✓ succeeded: hit-rate test green — `npm test -- cache` 6/6
- ✓ succeeded: p95 410 → 90 ms — k6 run, 200 VUs, 60 s
- ✓ succeeded: sensei confirmed staging looks right
- ✗ failed: EXPIRE inside MULTI — keys never expired; client swallowed the reply error
- ~ unverified: eviction under memory pressure — confirm with `redis-cli --bigkeys` on staging

## Compare
| approach | pro | con | outcome |
|----------|-----|-----|---------|
| in-memory LRU | zero infra, fastest | per-pod, pods disagree | ✗ dropped: stale reads across pods |
| Redis | shared, TTL built in | one more service | ✓ kept |
| CDN cache | no code | can't vary by auth | – not tried |

Winner: Redis. Results must be consistent across pods.

## Lessons
- EXPIRE inside MULTI fails silently on our client. Use `SET key val EX n`. (→ host memory: redis-expire-in-multi)

## Open
- Load-test eviction on staging before the release.

noa: the p95 number is from one k6 run. Re-run it to confirm.
```

Every section except **Done** and **Outcome** is optional. Leave out the empty ones.

## Notebook index line

Path: `.claude/noa/NOTEBOOK.md`. Append one line per filed session and never rewrite old lines. If the file is new, create it with a `# Noa's notebook` heading.

```markdown
- 2026-10-26 · Cache layer for /search · ✓3 ✗1 ~1 · [log](sessions/2026-10-26-cache-layer.md) · lesson: EXPIRE in MULTI fails silently; use SET EX
```

Keep each line under ~200 characters. The SessionStart hook loads the tail of this file, so the line has to make sense on its own.

## Durable lesson → host memory

When the host has its own memory system, use that format exactly. For Claude Code auto-memory, that means one file per fact, written into the memory directory named in the system prompt:

```markdown
---
name: redis-expire-in-multi
description: EXPIRE inside MULTI fails silently on the project's Redis client; use SET EX
metadata:
  type: project
---

EXPIRE issued inside a MULTI block never applies on this client; the error reply is swallowed.
**Why:** found 2026-10-26 when cache keys never expired (session log: .claude/noa/sessions/2026-10-26-cache-layer.md).
**How to apply:** set TTLs with `SET key val EX n`, never a separate EXPIRE in a transaction.
```

Then add one pointer line to that directory's `MEMORY.md` index. Before writing, check the existing memories. If one already covers the fact, **update** it (show sensei the diff first). If the session proved one wrong, propose deleting it.

Memory types to pick from: `user` (who sensei is, their preferences), `feedback` (how sensei wants you to work, and why), `project` (goals, constraints and decisions not visible in the code), `reference` (pointers to external resources).

## What is a good candidate

| Keep | Drop |
|------|------|
| A failure and its real cause | "Ran the tests" with no result |
| A decision and *why* | Code structure (the repo records it) |
| A gotcha that cost time | The commit list (git records it) |
| A preference sensei stated | Anything that only matters to this conversation |
| An approach that was dropped, and why | Guesses presented as facts |

## Redaction

Before showing any candidate to sensei, replace the value of each of these with `<redacted: kind>`:
- API keys and tokens, including `ghp_…`, `sk-…`, `xox…`, JWTs, and bearer headers;
- passwords and connection strings with credentials in them;
- private keys and certificates;
- personal data about anyone other than sensei, such as emails, phone numbers and addresses.

Keep the *fact*, not the secret. For example: "the staging DB URL lives in `.env.staging`", never the URL itself.
