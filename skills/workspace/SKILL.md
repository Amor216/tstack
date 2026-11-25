---
name: workspace
description: Set up or audit a project workspace so Tstack works at full strength: folder map and AGENTS.md, context files, the Tstack project files (MODULES.md, specs/, .out-of-scope/), the end-to-end verification, git and a private repo; or set up a whole Arbeitsordner (Home/ control centre plus Projekte, Karriere, Sammlung, Tabs, Archiv). Use for "Arbeitsordner einrichten", "neuer Rechner", "Home-Ordner aufsetzen", "Workspace einrichten", "neues Projekt", "Projekt aufsetzen", "Ordnerstruktur", or a project without AGENTS.md.
---

## Modus: Arbeitsordner einrichten

Use when the user says "Arbeitsordner einrichten", "neuer Rechner" or "Home-Ordner aufsetzen". No interview: the scaffold is fixed, the user fills it later.
1. Pick the target: the folder the user named, else `<Desktop>/Arbeitsordner`. Say it in one line.
2. Run `node "<this skill's base directory>/../../scripts/arbeitsordner.js" <target>` and show its output. It never overwrites existing files.
3. If `git -C <target>/Home status --porcelain` shows changes, commit everything in `Home/`.
4. Only after the user's OK (outward-facing), offer each:
   - Private repo: `gh repo create <name> --private --source <target>/Home --push`; suggest the name `home`, the user may pick another.
   - Link `~/.claude/skills` → `<target>/Home/skills`, only if `~/.claude/skills` does not exist. Windows: PowerShell `New-Item -ItemType Junction -Path <link> -Target <target>/Home/skills` (not `ln -s` in Git Bash, it copies); else `ln -s <target>/Home/skills <link>`. If `~/.claude/skills` exists (even empty), delete nothing; tell the user to move their skills into `Home/skills` by hand.
5. Continue with the new-project flow below for the first project under `Projekte/`.

## Neues Projekt

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
