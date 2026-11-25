# Coverage: every feature, checked by a program

`tstack/scripts/verify-coverage.js` decides whether the verification covers the code. `/tstack:verify-setup` and `/tstack:verify-maintain` end only when it exits 0; `/tstack:get-it-done` and the stop hook refuse to finish while it is red.

## Which features

Every user-facing feature gets its own file, not a selection. Take the list from `/tstack:inventory` (`INVENTORY.md`); without one, collect it from routes, CLI commands, menus, API endpoints and docs. A feature you cannot drive yet still gets a file: its `Gotchas` name the missing harness piece, and the run reports it.

## Two required lines per feature file

Put both lines directly under the H1 paragraph of `.claude/skills/verify-<app>/features/<feature>.md` (never in `README.md`):

```
Deckt ab: `src/search/**`, `src/cli/search.js`
Drive: `.claude/skills/verify-notes/verify.sh search`
```

- `Deckt ab:` lists the source paths this feature exercises, as backticked globs relative to the repo root (matched with `path.posix.matchesGlob`). `**` and `**/*` are invalid: one feature must not claim the whole repo. Shared code (router, store, styles) goes to the feature that exercises it most, or to a small `app-shell.md` feature with its own drive.
- `Drive:` is the command that drives exactly this feature through the real app and exits non-zero on failure. Usually the project's verify entry point with the feature name.

## What counts as source

Every changed file except: `.md` files; paths under `.claude/`, `specs/`, `.tstack/`, `docs/`; any path segment `test`, `tests`, `__tests__`, `e2e` or `fixtures`; names matching `*.test.*`, `*.spec.*`, `*_test.*`, `test_*`; lockfiles; dotfiles. Changed means: differs from the README's `In sync with:` commit, plus untracked files. Deleted files do not count.

## Verify drives the real app

The `Verify:` command launches the app and drives the features like a user (UI, CLI, API), as the generated skill describes. A run of unit tests alone is not verification: unit tests may run inside it, never instead of it.

## Run the check

```
node <tstack>/scripts/verify-coverage.js <repo>
```

`<tstack>` is the Tstack checkout or plugin directory (two levels above this skill). Exit 0 is green. Each red line names its gap:

- `nicht abgedeckt: <path>` → add a glob to the feature that exercises it, or a new feature file.
- `ohne Drive: <file>` → add the `Drive:` line.
- `keine Feature-Map`, `In sync with fehlt` or `unbekannt` → create the README or set the line to an existing commit.
- `Glob ** ist ungültig` → narrow the glob.

## Waiver

A repo without an app to drive (a skill pack, a document repo) records `Abdeckung: keine – <reason>` in its AGENTS.md. The check then passes as `waived`. Use it only when no user-facing surface exists, and say so to the user.

## Share of effort

`/tstack:get-it-done` counts tokens per run: worker = code, reviewer and verification worker = verification. `summary.json` reports `verificationShare` = verification / (code + verification). The target is at least 0.7: below that, the engine starts the verification worker even when coverage is green.
