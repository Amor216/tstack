---
name: code-review
description: Tstack three-axis review (not the built-in /code-review). Review the changes since a fixed point on three separate axes in parallel fresh subagents: Standards (repo rules, core rules, smell baseline, MODULES.md), Spec (does it do what the spec asked), Quality (correct, safe, holds under load, tested, fast, lean). Every finding needs a concrete case. Use when the user wants a review of a branch, a commit, work in progress, or says "review", "Code-Review", "prüf den Code".
---

Three-axis review of the diff between `HEAD` and a fixed point. Each axis runs in its own **fresh subagent** so they don't pollute each other's context; this skill aggregates. The same context reviewing itself isn't review.

## 1. Pin the fixed point

The fixed point is what the user named (commit, branch, tag, `main`, `HEAD~5`). Nothing named: uncommitted changes if there are any, else `git merge-base HEAD main` (or `master`). Capture `git diff HEAD` for uncommitted work, else `git diff <fixed-point>...HEAD`, plus `git log <fixed-point>..HEAD --oneline`. Confirm the ref resolves and the diff is non-empty before spawning anything.

## 2. Find the sources

- **Spec:** a path the user passed; else `specs/*.md` matching the branch, commit messages or the changed modules. None → the Spec axis reports "no spec available".
- **Standards:** the Tstack core rules (they are in your context; paste them), AGENTS.md, `CODING_STANDARDS.md`/`CONTRIBUTING.md` if present, `MODULES.md`, plus the smell baseline in [SMELLS.md](SMELLS.md). The repo overrides the baseline.

## 3. Spawn the three axes in parallel (one message, foreground)

Give each subagent the diff command, the commit list, and only its own material. Tell each: "Do not spawn agents. Report under 400 words."

- **Standards:** the standards files and SMELLS.md pasted in full. "Report each place the diff violates a documented standard (cite file + rule) and each baseline smell (name it, quote the hunk). Hard violations vs judgement calls. Check that `MODULES.md` reflects any new or changed module or interface, and that new or changed user-facing behaviour has its feature file in the project's verify skill (`.claude/skills/verify-*/features/`). Skip what tooling enforces."
- **Spec:** the spec. "Report (a) requirements missing or partial, (b) behaviour not asked for (scope creep), (c) requirements implemented wrongly. Quote the spec line for each."
- **Quality:** [QUALITY.md](QUALITY.md) pasted in full. "Review per QUALITY.md, run what you claim (a test, a command), and use its output format."

## 4. Aggregate

Present the three reports under `## Standards`, `## Spec`, `## Quality`, verbatim or lightly cleaned. Do not merge or rerank across axes. Drop any finding without a concrete case or file:line. End with one line per axis (findings, worst issue), then `Verdict: ship` or `Verdict: fix <numbers> first`, and `Lean: -<N> lines possible` if the Quality axis found any.

Lists findings, changes no code. Fixes go through `/tstack:simplify`, `/tstack:leichtbau` or a new worker; a review that never converges is cut after one fix round on cited findings.
