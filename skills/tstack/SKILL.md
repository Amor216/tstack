---
name: tstack
description: Main Tstack skill. Takes any goal (feature, change, bug, refactor, idea), picks the flow, runs the right skills in order and only stops where the user must decide. Use for /tstack, "mach das mit tstack", or any non-trivial task where the user names a goal rather than a skill.
---

# Tstack

## Start

1. Read [../next/MAP.md](../next/MAP.md). Look up the state (git status, `specs/`, `MODULES.md`, verify skill, tests) instead of asking.
2. Pick the flow from the map and write its steps into the todo list, one item per skill or decision. Copy them; a hand-written sequence drops steps.
3. **The user must see this block before the first step's output.** Send it as text, and also put it at the start of the args when you invoke the first skill. Never skip it, even when the goal looks small:

```
Ziel: <goal in one line> · Kleinstes Ergebnis: <smallest result that meets it>
Plan:
1. /tstack:<skill> – <why, one line>
2. ...
Du entscheidest in: <which steps need the user>
```

Open every subagent brief and the final report with the goal.

## Run

- Run each step by invoking its skill with the Skill tool (`tstack:<name>`) and follow it exactly. Not in the skill list: use the map's fallback and say so in one line.
- Ask the user only where a skill's own text says to ask, and before irreversible actions: deleting data, force-pushing, publishing, messaging people. Make every other reversible choice yourself and report it.
- **Verification gate:** before the first step that changes code, check the project's AGENTS.md `Verify:` line and `.claude/skills/verify-*`. Missing → `/tstack:verify-setup` becomes a step of the plan, before any build. Present it, never skip it silently. Present but stale (`git log <In sync with>..HEAD` shows user-facing changes and the feature map was not touched) → `/tstack:verify-maintain` becomes a step.
- After `/spec`, apply the map's build rule.
- A step is done when its check passed, not when the code is written.
- Between steps, decide context per [../next/PHASE-BOUNDARIES.md](../next/PHASE-BOUNDARIES.md). Keep clarify → fit → spec in one context.
- Fresh subagent for each delegated unit, with the goal, the step and file pointers, not pasted context. You own its output: read the diff and run the check yourself.
- Two failed attempts on the same premise: report to the user before a third fix.

## Candor

"No" is an acceptable answer. If the goal does not earn its cost, a step adds nothing, or the user's plan has a hole, say so with the reason before proceeding.

## Reply at the end

At most six lines: done, decided and why, verified how, open for the user, next command. This replaces the core reply lines.
