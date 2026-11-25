# Tstack map

Orientation only. Skills are installed with the plugin prefix: `/tstack:<name>`; use the name exactly as
the skill list shows it. A skill missing from the skill list is not built yet: use the fallback in brackets;
no fallback given → do the step here under the core rules and say in one line which skill is missing.

## Main flow: idea → shipped

1. **Clarify.** In a project: `/grill-docs` (interview + glossary + decision notes). No project yet: `/grill`.
   A question only something visible can answer → `/prototype`, then back. (fallback: `/grill`)
2. **Fit.** `/architect` places the change in the module structure and updates `MODULES.md`.
3. **Plan.** `/spec` writes one spec with steps, edges, failing-first checks and auto/manual marks.
   Skip for one or two files with an obvious approach.
4. **Verification gate (mandatory).** Before any step that changes code, the project must have its
   verification: an AGENTS.md `Verify:` line and a `.claude/skills/verify-*` skill. Missing → `/verify-setup`
   first, which designs it with the user. Skipped only when the user waives it for this task; record why.
   Verification exists but is stale (commits since the feature map's `In sync with:` changed user-facing
   code without touching the map) → `/verify-maintain` before the build.
5. **Build.** Pick by the build rule below: here with `/tdd` and the verification loop, `/get-it-done`, or
   `/get-it-done turbo`. (fallback: build here)
6. **Review.** `/code-review` (standards, spec, lean), then `/simplify`. (fallback: built-in `/code-review`, `/simplify`)
7. **Learn.** `/retro` turns what went wrong into checks, hooks or rules. (fallback: skip)

Steps 1–3 stay in one context: the spec needs the interview as a primary source.

## Build rule (manual, auto, turbo)

Answer in order; the first match wins.
1. One or two files, obvious approach → build here, verification loop, done.
2. Spec steps marked `manual` only, or fewer than three steps → build here, step by step.
3. Otherwise → `/get-it-done`, or `/get-it-done turbo` when time matters more than tokens. Turbo also speeds up a
   pure chain of steps: its planner splits steps into parts that run in parallel worktrees. Never call turbo
   pointless because steps depend on each other; say what the planner can split (pieces in different files).
Automated builds need a check per step that runs without the user; missing → step 4 of the main flow first.
Long runs leave the user free: say so and recommend what they can do meanwhile.

## Entry points

| Situation | Skill |
|---|---|
| Big or foggy effort, need a path to a spec | `/brainstorm` |
| Product exists, want new feature ideas | `/feature-ideas` |
| Unclear what a feature should do or bring | `/feature-design` |
| Doubt whether the current work serves the goal | `/sense-check` |
| Doubt whether existing features earn their place | `/feature-audit` |
| Need facts from docs, papers, the web, or how another technology or product works | `/research` |
| Need to know how this codebase works or why it is built so | `/how-it-works` |
| Something is broken | `/bugfix` |
| Several independent tasks, no spec needed | `/parallel` |
| How far is a running `/get-it-done` or `/parallel` | `/stand` |
| Overview of what exists | `/inventory` |
| Code feels bloated or sloppy | `/slop-audit` → `/architect` (improve) → `/modularize` |
| Shrink a diff or a path | `/leichtbau` |
| A behaviour to build test-first, no spec | `/tdd` |
| Project has no verification, or a new surface | `/verify-setup` |
| Verification is stale, or its design should change | `/verify-maintain` |
| New project or folder structure | `/workspace` (fallback: `/new-project`) |

## Phase boundaries

The orchestrator session manages its own context per [PHASE-BOUNDARIES.md](PHASE-BOUNDARIES.md): continue,
delegate to subagents or headless workers, keep state in files. Never ask the user to `/clear`, `/compact` or start a new session.
