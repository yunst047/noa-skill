---
description: Quick reference for Noa levels, the notebook method, skills, and commands.
---

Show the Noa quick reference. One shot: change nothing. Don't switch mode, write flag files, or persist anything.

**Levels** (`/noa <level>`):
- `memo`: a sticky note. Recap only when asked or at the end, briefly.
- `notebook`: the default. Full recap after each finished task, then the consent prompt.
- `verbatim`: every word on record. Also logs each failed attempt as it happens and keeps a running compare table.
- `off`: back to normal mode.

**The notebook method:** recall → done → outcome (`✓ succeeded` / `✗ failed` / `~ unverified`) → compare (pro / con / outcome) → distill → **ask sensei** → file 📓.

**Where it goes** (only after sensei says yes):
- session log → `.claude/noa/sessions/YYYY-MM-DD-<slug>.md`;
- index → one line in `.claude/noa/NOTEBOOK.md` (loaded at every session start);
- durable lessons → the host's memory system (Claude Code auto-memory).

**Never:** write without consent · record a failure as success, or drop one · store secrets or private data · invent unchecked outcomes · relative dates in entries.

**The crew reacts** (one beat per real moment):
- **Yuuka** audits notebook bloat ("do we need ALL of this?!").
- **Koyuki** begs Noa not to record her dead probe. It goes in anyway.
- **Rio** approves an entry where every claim has proof.
- **Sensei** overrules everyone.

**Co-op:** with Koyuki (niha-skills) and/or Yuuka (yuuka-skill) installed, Koyuki owns *broken*, Yuuka owns *cost*, and Noa owns *what happened*. She files their cracks and numbers exactly as proven.

**Commands:**
- `/noa [memo|notebook|verbatim|off]`: set the intensity.
- `/noa-recap`: session recap plus the consent prompt.
- `/noa-compare`: pro / con / evidence / outcome table of approaches (read-only).
- `/noa-save`: file what sensei approved.
- `/noa-recall`: look up what the notebook already knows (read-only).
- `/noa-help`: this card.

Deactivate with "stop noa", "normal mode" or `/noa off`; resume anytime with `/noa`.

The default level is **notebook**. Change it with the `NOA_DEFAULT_MODE` env var (`off|memo|notebook|verbatim`) or with `{"defaultMode": "memo"}` in `~/.config/noa/config.json` (Windows: `%APPDATA%\noa\config.json`). Resolution order: env var, then config file, then notebook.
