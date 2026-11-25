---
name: workspace
description: Set up or audit a project workspace so Tstack works at full strength: folder map and AGENTS.md, context files, the Tstack project files (MODULES.md, specs/, .out-of-scope/), the end-to-end verification, git and a private repo. Use for "Workspace einrichten", "neues Projekt", "Projekt aufsetzen", "Ordnerstruktur", or a project without AGENTS.md.
---

Reuse first: if the `new-project` skill is installed, run it (Skill tool) for the interview, the folder map, AGENTS.md/CLAUDE.md, context.md files, learnings, skills and hooks; it also audits existing projects. Then add the Tstack layer below. Without `new-project`: ask in one round (in a `claude -p` run: report BLOCKED with the questions) (purpose, language and stack, where it lives) and create AGENTS.md with a short intro, build and test commands, and a folder map, plus CLAUDE.md as a one-line pointer to it.

## Tstack layer

Create only what is missing; never move or overwrite existing files.
1. `MODULES.md` per `../architect/MODULES-FORMAT.md` (from the code, or an empty frame for a new project).
2. `specs/` and `.out-of-scope/` folders (with a one-line README each).
3. `.gitattributes` with `*.sh text eol=lf` when the project has shell scripts.
4. **Verification:** if AGENTS.md has no `Verify:` line, the next step is `/tstack:verify-setup`. Say that code changes are blocked until it exists.
5. Git: `git init` if needed, `.gitignore` for secrets (`.env`), dependencies and build output; a private GitHub repo when the user's rules ask for one (`gh repo create --private`), first commit, push.
6. A pointer to the project in the home repo's AGENTS.md, if the user works from a home repo.

Reply: what was created, what already existed, and the next command (usually `/tstack:verify-setup`).
