---
name: verify-setup
description: Build a project's end-to-end verification environment: a project-local skill and script that launch the real app, drive it like a user (UI, CLI, API), capture evidence and clean up. Use for /verify-setup, "Verifikation einrichten", before any automated build, or when a project has no scripted way to prove behaviour.
---


# Verify setup

Built once per project. If AGENTS.md already has a `Verify:` line and `.claude/skills/verify-*/features/README.md` exists, do not build a second one: run `/tstack:verify-maintain` instead. A partial setup (only `DESIGN.md`) is resumed here.

This skill generates a scripted way to drive the real app and prove behavior as a project-local skill (`.claude/skills/verify-<app>/`) tailored to the repo. Write it for an agent that reads it cold and never saw the app.

## 1. Facts from the repo, decisions with the user

First collect the facts from the codebase (spawn read-only subagents for a large repo), never asking the user what you can observe:

- **Surface:** what does a user actually touch? A web UI, a CLI/TUI, a desktop app, an API, a mobile app, a library? A repo can have several; pick the primary one and note the rest.
- **Run:** how does the app start locally? Prefer the repo's own documented dev command (package scripts, Makefile, README quickstart). Note ports, env vars, seed data, auth.
- **Drive:** how can an agent interact with it programmatically? Existing harnesses first — Playwright/Cypress specs, expect scripts, PTY helpers, curl-able endpoints, a debug port. Only then pick a generic recipe: browser/CDP for web and Electron, a tmux/PTY harness for CLI/TUI, plain HTTP for services.
- **Observe:** what evidence can be captured? Screenshots, terminal transcripts, response bodies, logs, exit codes, DB state.
- **Isolate:** can two instances run side by side (ports, data dirs, profiles)? If not, say so in the generated skill: refusing to double-drive a shared instance beats corrupting the user's session.

Then design the verification together with the user: read `../grill/SKILL.md` with the Read tool and run the interview in [INTERVIEW.md](INTERVIEW.md) in exactly that round format (`❓ **Q1** - ...` / `➡️ ...`): proof per journey, tools the agent gets, isolation, mocks, speed tiers, when it runs, evidence. Generate nothing before the user confirmed the design. If the user already stated decisions in the request, take them and ask only what is still open.

Before generating, always write the agreed decisions to `.claude/skills/verify-<app>/DESIGN.md`, one line per decision with its reason. `/tstack:verify-maintain` changes them later.

If the checkout doesn't build or start as-is, fix that first (or report it precisely) before generating; a skill written against a broken base teaches wrong steps. When an irrelevant missing asset blocks startup (a static dir the API never serves, a sample config), the generated skill may create it, clearly marked as verification scaffolding, and remove it in cleanup.

## 2. Generate the skill

Write `.claude/skills/verify-<app>/SKILL.md` with YAML frontmatter (`name: verify-<app>` and a `description` that names the app, the surface, and when to reach for it — without frontmatter the skill never registers) and these sections, each grounded in what the interview actually found (no placeholders left):

- **Launch:** the exact command that starts the app for verification, and how to tell it's ready (a log line, a prompt). Launch must reach a usable state from an empty data dir, including any migrations and seed data. Ready means usable, not just that a process answers. A database health check can pass while its init scripts are still running. Include teardown. For a short-lived CLI or TUI there is no server to keep alive: launch means build the binary (or install deps) once, then start each drive in its own isolated PTY or tmux session.
- **Doctor:** one read-only check that answers "is this instance worth driving?" — process up, right version/build, port owned by us, auth valid. An agent runs this first whenever anything looks off.
- **Drive:** the harness recipe with real selectors/commands from this repo, not examples. Prefer stable handles (ARIA labels, data attributes, prompt strings, route paths) over coordinates and tab order.
- **Evidence:** what to capture for a proof and where it goes. State the proof standards: exercise the real user path, not internal setters or test-only endpoints; capture the action and the resulting state, not just the final screen; verify side effects (files written, rows inserted, messages sent) alongside what's visible; mocks only where a production boundary already isolates the external system. When the safe path is a dry-run or test mode, verify what it actually skips by observing (files, network, git refs) rather than trusting its name: some dry-runs still touch the network or open a browser.
- **Cleanup:** how to tear down instances the run created. Never kill by process name; kill what you started. Cleanup removes instances and scratch state, never the evidence: proof artifacts survive the teardown, in a location the skill names.
- **Portable checks:** independent of system language and OS, per [PORTABLE.md](PORTABLE.md).
- **Helpers:** any script the skill ships is executable and its invocation is shown in the skill body. A helper the reader has to reverse-engineer is not a helper.

## 3. Seed the feature map

Create `.claude/skills/verify-<app>/features/README.md` plus one file per user-facing feature, every one, with `Deckt ab:` and `Drive:` lines per [references/coverage.md](references/coverage.md). Follow the shape in [`references/feature-map-example/`](references/feature-map-example/), with a README index and one file per feature. Each file answers, from the user's POV: what the feature is, how to reach it, how to drive it, and what observable end state proves it works. Start the README with `In sync with: <commit sha>` (the commit the map describes). The four H2s are `Sub-features`, `How to get to it (user POV)`, `Driving it with <harness>`, and `Gotchas`. If the seed data lacks a precondition that a journey needs, the journey reports a failure and the reason goes in that feature's `Gotchas`. Never weaken the journey to make it pass. The map is the repo's maintained verification source; a proof that drives one convenient entry point is incomplete when the map lists others.

## 4. Prove the generated skill before handing it over

Run its own instructions end to end once: launch, doctor, drive ONE mapped feature (later runs cover the rest), capture evidence, clean up. After cleanup, confirm the evidence still exists at the named location — a cleanup that eats the proof fails this step. Fix what fails, and run the generated cleanup after every failed iteration too, so broken attempts don't strand processes and ports. A generated skill that was never executed is a draft, not a deliverable. If you proved it in a stand-in for the real target (a container in place of a fresh VM, a local stack in place of a remote one), list every setup step the stand-in did that the target will not. Those steps stay unverified until a run on the real target covers them.

## 5. Wire it into the project

- Ship one non-interactive entry point, `.claude/skills/verify-<app>/verify.<sh|ps1|py>`, that runs launch, doctor, the drive for a named feature (or all), evidence and cleanup, and exits 0 on pass and non-zero on fail. Workers and `/tstack:get-it-done` run this without a human; prove it once with a pass and once with a deliberately broken input that fails.
- Add one line to the project's AGENTS.md: `Verify: <exact command>`. It drives the real app; unit tests alone do not count.
- Done only when `verify-coverage.js` exits 0 (see coverage.md).

## 6. Offer the maintenance loop

Point the user at `/tstack:verify-maintain` to keep the map honest as the app changes. Suggest a cadence only if asked.
