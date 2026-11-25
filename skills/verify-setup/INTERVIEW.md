# Verification design interview

Run it with the mechanics of `../grill/SKILL.md` (design tree, rounds, frontier, one recommendation per question). Facts come from the repo scan first; the user decides only what follows from them. Ask only the branches that are open for this project.

## Design tree

1. **Surfaces.** Which surfaces must be proven (web UI, desktop window, CLI, API, background job, model output)? Primary one first.
2. **Journeys.** The top 3–5 user journeys from the feature map: does each one belong in the first version?
3. **Proof per journey.** What observable end state proves it works: visible text, a screenshot compared to a baseline, a file or row written, a response body, an exit code, a metric within a bound? A proof checks the effect, not that a function ran.
4. **Tools the agent gets.** From what the repo already has first, then: browser automation (Playwright/CDP), desktop app driver (WebDriver, tauri-driver, accessibility API), screenshots and image diff, PTY/tmux for CLIs, curl/HTTP, database or file inspection, log tailing. Name each tool, what it is for, whether it needs installing (ask before installing anything).
5. **Isolation and data.** Separate data dir, profile, port or test account; seed data; nothing touches the user's real data or a running instance the user works in. It must run in several worktrees at the same time (`/tstack:get-it-done turbo`): free ports and per-run data dirs, or a lock that serializes runs.
6. **Mocks.** Where a production boundary already isolates an external system (payment, LLM API, network) a stand-in may be used; everywhere else the real thing.
7. **Speed and tiers.** A fast check per step (seconds) and the full end-to-end run (minutes): what goes where, and the time budget of each.
8. **When it runs.** In every implementation's verification loop, after each `/tstack:get-it-done` step, before landing; what result blocks.
9. **Evidence.** Where proof artifacts go, how long they stay, which go into a report.

## Done

The frontier is empty and the user confirmed. Write the decisions to `.claude/skills/verify-<app>/DESIGN.md` (one line per decision, with the reason), then generate the skill against them. A later change to any decision goes through this interview again for that branch, via `/tstack:verify-maintain`.
