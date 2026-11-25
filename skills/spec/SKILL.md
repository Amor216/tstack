---
name: spec
description: Turn settled decisions into one spec file with steps, dependency graph, a failing-first check per step, and auto/manual marks, ready for /get-it-done. Use after /grill, when the user says "spec", "schreib die Spec", "plan das", or before any multi-step build.
---

Synthesize; do not re-interview. Decisions still open → read `../grill/SKILL.md` and grill only those. When the change is one or two files with an obvious approach, skip the spec: say so and build it.

## Process

1. **Explore.** Read the project's AGENTS.md, `MODULES.md`, `GLOSSARY.md` and `docs/adr/`, and the code the change touches. Use the project's terms throughout.

2. **Fit into the architecture.** If `/architect` ran in this conversation, take its shape and go to step 3. Otherwise decide which module takes the feature: deepen an existing module first; else a new module with a small interface; never a shallow helper. If restructuring makes the change easy, that restructuring is step 1 ("make the change easy, then make the easy change"). No `MODULES.md` yet → read `../architect/SKILL.md` and create it first.

3. **Choose the checks.** Prefer existing seams, the highest seam possible, and as few as possible. Each step gets one command a worker can run without the user, that fails on the starting commit and passes when the step is done. No unit-test seam → build, typecheck, a scripted smoke run or the project's verify skill. Settle a check you cannot write by prototype, not by guessing.

4. **Cut steps.**
   - Each step cuts a narrow but COMPLETE path through every layer it needs: vertical, not one layer. A finished step is demoable or verifiable on its own.
   - Each step fits a single fresh context window and is readable alone: a worker sees only its step, the spec header and the pointers it names.
   - Prefactoring comes first.
   - A wide mechanical change (rename, retype across the codebase) runs as expand → migrate in batches → contract, each its own step.
   - Give each step its **blocked by** edges and the modules/shared files it **touches**. Two steps that write the same file get an edge: worktrees postpone collisions to merge time, they do not remove them.
   - A spec that adds or changes user-facing behaviour ends with a step **Verifikation erweitern**, blocked by those steps: it adds or updates the feature files in the project's verify skill per `../verify-maintain/SKILL.md`, extends the verify script, and its check is the AGENTS.md `Verify:` command.
   - Mark each step `auto`, or `manual` when it needs a human judgement, a visual call, credentials or an irreversible action.

5. **Show the breakdown** as one table (step, blocked by, mode, what it delivers) and ask in one round: granularity right? edges right? test seams right? merge or split anything? Iterate until approved.

6. **Write** `specs/<NN>-<slug>.md` from [SPEC-TEMPLATE.md](SPEC-TEMPLATE.md) in the user's language, with `Status: entwurf`.

7. **Acceptance.** Spawn one fresh subagent that did not write the spec. Give it the spec path and this checklist; it returns PASS, or ISSUES with the failing items:
   - A worker could build each step without asking a single question.
   - Each check command exists or is specified exactly, and fails on the current commit.
   - Each step is vertical and demoable; edges are complete; no two unblocked steps touch the same file.
   - Nothing in the spec contradicts the code, `MODULES.md` or the decisions.
   Fix and re-run until PASS. Run the check commands that already exist yourself and record that they fail.

   On PASS set `Status: abgenommen`, update `MODULES.md` with the planned change, commit both.

Reply: the spec path, the steps with edges and modes, which steps can run in parallel, and the next command per the build rule in `../next/MAP.md`.
