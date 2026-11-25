---
name: stand
description: Show where /get-it-done and /parallel runs stand, as a graph in the terminal: every step with its state (done, running with phase and round, waiting on which step, blocked, split, the review at the end), its worktree, merge commit and tokens, plus the run's total time and tokens, and the resume command for a stopped run. Use for "wie weit ist er", "Stand", "wo steht der Lauf", "zeig mir die Läufe", "was läuft gerade", or whenever the user asks about a running orchestrator.
---

1. Run `node "<this skill's base directory>/../../scripts/status.js" <repo root>` (add `--all` when the user asks for older runs) and show its output unchanged in a code block.
2. Below it, at most three lines: what changed since the last look, and anything that needs the user (a `blocked`, `manual` or `split` step, a stopped run with its `--resume` command, a step in its third round or later).
3. For a live view, give the user this command for a second terminal: `node "<this skill's base directory>/../../scripts/status.js" "<repo root>" --watch`. It redraws every 2 s and ends when no run is live.

Never infer the state from memory or from the background task's output: the script reads the run's log, spec and summary.
