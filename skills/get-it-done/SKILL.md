---
name: get-it-done
description: Orchestrator. Runs the auto steps of an approved spec automatically: one headless worker session per step in its own worktree that keeps fixing until the step check and the verification are green, merge, then one /tstack:code-review and /tstack:simplify fix over the whole run, final end-to-end verification, then lands on the base branch. "turbo" splits steps into parts and runs everything independent in parallel, also inside a chain of steps. Use for /get-it-done, "mach das automatisch", "lass das durchlaufen", or after /spec when the build rule says so.
---

You are the orchestrator chat. A program makes the run's decisions; you prepare it, start it, watch it and report.

## Preflight (stop and say what is missing)

1. The argument is a spec path (`/tstack:get-it-done [turbo] specs/<file>.md`). No spec → recommend `/tstack:spec` and stop.
2. The spec has `Status: abgenommen`, every `auto` step has a `Prüfbefehl` in backticks, and the steps use the template fields (`- [ ] erledigt`, `Blockiert durch`, `Modus`, `Berührt`). Not accepted → offer to run the acceptance from `/tstack:spec` first.
3. The working tree is clean (`git status`). The project has an AGENTS.md `Verify:` line; none → run `/tstack:verify-setup` first (the engine refuses to start without it). A recorded waiver `Verify: none – <reason>` counts as present; the engine then skips the final project verification.
4. Tell the user in three lines: steps, that turbo's planner decides the split (never that turbo brings nothing because steps depend on each other), that they can work on something else, and that you will report when it lands or blocks.

## Run

Start the engine in the background with the Bash tool (`run_in_background: true`), from the repo root:

```
node "<this skill's base directory>/../../scripts/gid.js" <spec> [--turbo] [-j 4]
```

Before the first worker the engine runs a preflight on the spec as it reads it from the integration worktree: unknown or duplicate step ids, a `Berührt` that is missing or reads empty, a missing `Prüfbefehl`, a check that already passes. Any hit stops the run with exit 2 and the list in `summary.json` (`preflight`); fix the spec and start again.

Every failure the engine sees (worker error, round rejected despite a green check, merge rejected, step stuck, review or fix worker error, final check red, land or push failed, crash) is appended as `- [ ] [auto …]` to the improvement list: `tstack-verbesserungen/verbesserungen.md` next to a `tstack/` checkout, else `~/.tstack/verbesserungen.md`. The next session start names the open ones and offers to fix them at the cause.

Turbo: after the preflight a read-only planner (`core/planner.md`) splits each open auto step into parts with their own `Berührt`, check and edges, and may drop a step edge a part does not need; a contract part (interface, stub) lets dependent pieces run in parallel. The engine keeps a split only when every part stays inside the step's `Berührt`, its edges are the step's own or sibling parts, there is no cycle and each part check is red now; otherwise the step runs whole and the log says why. Parts run like steps (worker session, gates, merge); when all are merged the step's own check runs (`join`), and if it is red one worker finishes the step. The plan is kept in `.tstack/runs/<id>/plan.json` for `--resume`; `summary.json` gets `parts` and `criticalPath` (`before` → `after`, in workers on the longest chain).

The engine creates an integration worktree, then per step: a worktree and one worker session (`claude -p`, rules in `core/worker.md`) that runs the step check and `Verify:` and fixes until both are green. Then the engine checks the gates itself: a commit, the step check, no edit to the check, the spec or AGENTS.md, coverage, the check after the merge. A red gate goes back into the same session (`--resume <session_id>`) with its output, round after round, until every gate is green; there is no attempt limit and no `failed` step. A step stops only when it needs the user: the worker reports `Verdict: BLOCKED – <reason>` (`blocked`, also with a green check), its context fills up (`split`), or a round ends without a new commit since the round before (`blocked`, `stuck: …`). When every step is merged, one `/tstack:code-review` (its `SKILL.md` as the prompt, headless, may start its axis subagents, edits nothing) reviews the run's whole diff; the full text is kept in `.tstack/runs/<id>/review.md`. Unless it ends with `Verdict: ship`, one worker applies the cited findings and `/tstack:simplify` to the run's diff (result in `fix.result.md`); there is no second review round. Then all step checks plus the project `Verify:` command run end to end; green fast-forwards the base branch and pushes, red keeps the integration branch. Every `claude -p` call runs with `CI=true` and `--strict-mcp-config` (no MCP servers: smaller context per turn). Log: `.tstack/runs/<id>/log.tsv` (last column: new tokens of that call, i.e. input + cache creation + output; cached re-reads are not counted), result: `summary.json` (step states and tokens per step and in total). After a green step check, before the merge, the engine starts a verification worker (`core/verifier.md`) in the step's worktree when `verify-coverage.js` is red: it extends feature files, `Deckt ab`, `Drive` and the verify script, never the step's code; the engine re-checks the step and coverage after it. Without a feature map and without `Abdeckung: keine – <reason>` in AGENTS.md the preflight stops the run. Tokens: worker and fix worker = code, review and verification worker = verification; `summary.json` has `tokens.code`, `tokens.verification`, `costUsd` (code, verification, total, from each call's `total_cost_usd`) and `verificationShare` (0–1, share of the cost). A worker whose context fills up (PreCompact hook) ends its step as `split`: the step is too big for one chat.

Do not poll. When the user asks how far it is, run `/tstack:stand`. When the background task finishes, read `summary.json` and the log. Never redo a step yourself to make the run look green.

## Report

Always give `costUsd.total`, the new-token total and `verificationShare` from `summary.json`; below 0.7, say so. Turbo: also `criticalPath` before → after and which steps ran as parts.

- Landed: what was built, steps and their rounds, the review's verdict and what the fix worker changed, the final check, the pushed commit. Send a push notification with the one-line result (PushNotification tool; unavailable → say so in the reply).
- Not landed: which step is blocked (with its reason) or needs a split, or that the final check is red (with its output and `review.md`), the integration branch to inspect, `manual` steps waiting for the user, and the next command. A stopped run continues on its integration branch with `gid.js <spec> --resume <id>` after the cause is fixed (a `split` step: split it in the spec on that branch first); finished steps stay, leftover worktrees are removed. Send a push notification (PushNotification tool): the user may be away.
- A step blocked with `env-gap` (in its `step blocked` log line): the verification environment cannot prove it. Say what is missing and ask whether to extend it. On yes, run `/tstack:verify-maintain` for that gap on the base branch, commit, and resume with `--resume <id>`: the engine merges the base branch into the run first, so the next worker has the new harness.
