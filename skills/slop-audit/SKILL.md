---
name: slop-audit
description: Audit a codebase (or a folder) for slop and quality problems and show the current state against the target state as a visual HTML report: bugs, risks, load, missing tests, slowness, dead or duplicated code, shallow modules, AI-prose in docs and comments. Report only, changes nothing. Use for /slop-audit, "finde den Slop", "wie schlimm ist der Code", "Ist/Soll", "audit".
---

Report only; this skill changes no code. The target state it shows is executed later by `/tstack:modularize` (structure), `/tstack:leichtbau` (less code) or `/tstack:bugfix` (defects).

## 1. Audit

Follow [AUDIT.md](AUDIT.md) exactly for the map, the six finding kinds, the checks before reporting and the per-finding format. Add three slop lenses:
- **Smells:** the baseline in [../code-review/SMELLS.md](../code-review/SMELLS.md), each a labelled judgement call.
- **Shallow modules:** read `MODULES.md` (or map the modules first); apply the deletion test from the core rules to each module and interface.
- **Prose slop:** comments, READMEs, AGENTS.md and docs against [PROSE.md](PROSE.md).

For a large repo, spawn one fresh read-only subagent per area, each with AUDIT.md and its area; tell them not to spawn agents. Aggregate and re-check every finding you keep.

## 2. Ist / Soll report

Write one self-contained HTML file to `.tstack/reports/slop-audit-<date>.html` (kept out of git, found again by `/tstack:modularize`) per [../architect/HTML-REPORT.md](../architect/HTML-REPORT.md), open it and give the path. It contains:
- **Ist:** the module graph as it is (mermaid), each module marked with its finding count, plus totals: findings per kind, lines that could go, dependencies that could go.
- **Soll:** the same graph after the proposed changes: merged or deepened modules, deleted parts greyed out.
- One card per finding in the four-part format of AUDIT.md (what this is, problem, fix, if we skip it), grouped Must fix / Should fix / Nice to have, numbered across groups.

## 3. Reply

In the chat: the verdict line, the top five findings by number, `Lean: -<N> lines, -<M> dependencies possible`, `Not checked:`, the report path, and which skill executes which findings next.
