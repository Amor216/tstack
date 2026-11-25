# Phase boundaries

A **phase** is a chunk of work inside a session: the grilling, the spec, the build, the QA. It ends when you think *"ok, we're done with that"*.

The session that talks with the user is the **orchestrator**. It manages its own context. It never asks the user to run `/clear` or `/compact`, to open a new session, or to paste a handoff: those are the orchestrator's job, not the user's.

## How the orchestrator stays lean

1. **Continue** when the next phase needs this phase as a primary source. Grilling → spec is the standard case: the spec wants the reasoning verbatim, not a summary of it.
2. **Delegate the heavy part.** Reading many files, research, audits and reviews go to a fresh subagent; it returns a report, not file dumps. Building goes to `/tstack:get-it-done` or `/tstack:parallel`: fresh headless workers per step, the orchestrator only starts and reads the run.
3. **Keep state in files, not in the chat.** Decisions go to the spec, `MODULES.md`, `GLOSSARY.md` or the brainstorm map as they settle. Then any compaction loses nothing that matters, and a stopped run continues with `--resume`.
4. **Compaction is automatic.** Claude Code compacts the session when it reaches its auto-compact window (`autoCompactWindow`, set at install, see the Tstack README). Do not announce it or ask for it.

Mid-phase there is no decision to make: continue, or split the rest into subagents.
