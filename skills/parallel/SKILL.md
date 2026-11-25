---
name: parallel
description: Run several independent tasks at once, each in its own worktree with a fresh headless worker, a check, a reviewer and a merge, without writing a full spec first. Use for /parallel, "mach das parallel", "diese Aufgaben gleichzeitig", or a list of small independent changes.
---

`/tstack:parallel` is `/tstack:get-it-done turbo` for a task list. It reuses the same engine; only the spec is written for you.

1. Turn the user's tasks into steps. Each task needs a check command a worker can run without the user that fails now; look the facts up, and ask the user (one round, numbered, with recommendations) only for a task whose expected result is unclear; in a `claude -p` run, report BLOCKED with that question instead. Tasks that change the same file get a `Blockiert durch` edge.
2. Write `specs/parallel-<yyyymmdd-hhmm>.md` from `../spec/SPEC-TEMPLATE.md` with `Status: abgenommen`, one step per task, all `Modus: auto`. Run each check command once and confirm it fails. Commit the spec.
3. Run it exactly as `/tstack:get-it-done` does (read `../get-it-done/SKILL.md`, then run its preflight from step 3 on, then the Run and Report sections) with `--turbo`.
