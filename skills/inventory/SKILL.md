---
name: inventory
description: Build a feature inventory and a codebase inventory of a project: every user-facing feature with its entry point and verification coverage, every module with its interface, size, tests and dependencies, the external dependencies, and candidates that look dead. Writes INVENTORY.md and creates MODULES.md if missing. Use for "Inventar", "was gibt es alles", "Überblick über die Codebase", "welche Features hat das".
---

Facts only, from the code; mark anything inferred. For a large repo, spawn one read-only subagent per top-level area (fresh context, no further agents) and merge.

## Feature inventory

Every user-facing capability: commands, routes and screens, public API functions, jobs, integrations. Per feature: name in the project's terms, entry point (file:line), what the user gets in one line, verification coverage (a feature file in `.claude/skills/verify-*/features/`, a test, or none).

## Codebase inventory

- **Modules:** take `MODULES.md`; missing → create it per `../architect/MODULES-FORMAT.md` from the code. Per module: path, interface in one line, lines of code, test seam and test count, the modules it uses.
- **Dependencies:** each external package with what uses it; one used in a single place for a few lines is a `/tstack:leichtbau` candidate.
- **Entry points and config:** how the app starts, build and test commands, env vars it reads (names only, never values).
- **Dead candidates:** exported symbols, files or options with no reference anywhere (grep the whole tree incl. tests, config and strings before listing).
- **Hot spots:** the 10 files changed most in `git log` with their change count.

## Output

Write `INVENTORY.md` at the project root with a `Stand: <date> · <commit>` line, the two inventories as tables, and a short summary: features without verification, modules without a test seam, dead candidates. Reply with that summary, the path, and the next skills it suggests (`/tstack:verify-maintain`, `/tstack:leichtbau`, `/tstack:feature-audit`).
