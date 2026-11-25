---
name: get-it-done
description: Orchestrator. Runs the auto steps of an approved spec automatically: one fresh headless worker per step in its own worktree, the step check run by the program itself, a separate reviewer, merge, final verification, then lands on the base branch. "turbo" runs independent steps in parallel. Use for /get-it-done, "mach das automatisch", "lass das durchlaufen", or after /spec when the build rule says so.
---

You are the orchestrator chat. A program makes the run's decisions; you prepare it, start it, watch it and report.

## Preflight (stop and say what is missing)

1. The argument is a spec path (`/tstack:get-it-done [turbo] specs/<file>.md`). No spec → recommend `/tstack:spec` and stop.
2. The spec has `Status: abgenommen`, every `auto` step has a `Prüfbefehl` in backticks, and the steps use the template fields (`- [ ] erledigt`, `Blockiert durch`, `Modus`, `Berührt`). Not accepted → offer to run the acceptance from `/tstack:spec` first.
3. The working tree is clean (`git status`). The project has an AGENTS.md `Verify:` line; none → run `/tstack:verify-setup` first (the engine refuses to start without it). A recorded waiver `Verify: none – <reason>` counts as present; the engine then skips the final project verification.
4. Tell the user in three lines: steps, which run in parallel (turbo), that they can work on something else, and that you will report when it lands or blocks.

## Run

Start the engine in the background with the Bash tool (`run_in_background: true`), from the repo root:

```
node "<this skill's base directory>/../../scripts/gid.js" <spec> [--turbo] [-j 4]
```

Before the first worker the engine runs a preflight on the spec as it reads it from the integration worktree: unknown or duplicate step ids, a `Berührt` that is missing or reads empty, a missing `Prüfbefehl`, a check that already passes. Any hit stops the run with exit 2 and the list in `summary.json` (`preflight`); fix the spec and start again.

Every failure the engine sees (worker error, attempt rejected despite a green check, reviewer without verdict, merge rejected, step failed, final check red, land or push failed, crash) is appended as `- [ ] [auto …]` to the improvement list: `tstack-verbesserungen/verbesserungen.md` next to a `tstack/` checkout, else `~/.tstack/verbesserungen.md`. The next session start names the open ones and offers to fix them at the cause.

The engine creates an integration worktree, then per step: a worktree, a worker (`claude -p`, rules in `core/worker.md`), the step check run by the engine, a reviewer that did not write the code (`core/reviewer.md`), merge, re-check, spec checkbox. At most two attempts per step, a time limit per worker, a diff-size limit; findings of a failed attempt go to the next worker. When every step is done and all checks plus the project `Verify:` command pass, it fast-forwards the base branch and pushes. Every `claude -p` call runs with `CI=true`. Log: `.tstack/runs/<id>/log.tsv` (last column: tokens of that worker or reviewer call), result: `summary.json` (step states and tokens per step and in total). After a reviewer PASS, before the merge, the engine starts a verification worker (`core/verifier.md`) in the step's worktree when `verify-coverage.js` is red or the verification share is below 0.7: it extends feature files, `Deckt ab`, `Drive` and the verify script, never the step's code; the engine re-checks the step and coverage after it. Without a feature map and without `Abdeckung: keine – <reason>` in AGENTS.md the preflight stops the run. Tokens: worker = code, reviewer and verification worker = verification; `summary.json` has `tokens.code`, `tokens.verification` and `verificationShare` (0–1). A worker whose context fills up (PreCompact hook) ends its step as `split` without a retry: the step is too big for one chat.

Do not poll. When the user asks how far it is, run `/tstack:stand`. When the background task finishes, read `summary.json` and the log. Never redo a step yourself to make the run look green.

## Report

Always give the token total and `verificationShare` from `summary.json`; below 0.7, say so.

- Landed: what was built, steps and attempts, the final check, the pushed commit. Send a push notification with the one-line result (PushNotification tool; unavailable → say so in the reply).
- Not landed: which step failed, blocked or needs a split and the reviewer's or check's findings, the integration branch to inspect, `manual` steps waiting for the user, and the next command. A stopped run continues on its integration branch with `gid.js <spec> --resume <id>` after the cause is fixed (a `split` step: split it in the spec on that branch first); finished steps stay, leftover worktrees are removed. Send a push notification (PushNotification tool): the user may be away.
- A step blocked with `env-gap` (in its `step blocked` log line): the verification environment cannot prove it. Say what is missing and ask whether to extend it. On yes, run `/tstack:verify-maintain` for that gap on the base branch, commit, and resume with `--resume <id>`: the engine merges the base branch into the run first, so the next worker has the new harness.
