---
name: feature-audit
description: Judge the existing features of a product on whether they still serve its goal: per feature the goal it serves, evidence of use, its cost in code, bugs and complexity, and a verdict (keep, improve, merge, remove). Report, changes nothing. Use for "welche Features bringen was", "Feature-Audit", "was kann weg", "ist das Feature sinnvoll".
---

Report only. Removals and merges are executed later by `/tstack:leichtbau`, `/tstack:modularize` or a spec.

## 1. List the features

From `/tstack:inventory` output if present, else from the entry points (commands, routes, screens, public API) and the verify feature map. One line each: name, entry point, what the user gets.

## 2. Judge each feature

With evidence, or marked as a guess:
- **Goal:** which part of the product goal it serves (AGENTS.md, README, specs); none → say so.
- **Use:** signs of real use: logs, analytics, user reports, how often its code changed for fixes vs features (`git log --oneline -- <paths>`), mentions in issues or docs.
- **Cost:** lines of code, dependencies only it needs, bugs and fixes in its history, how much of `MODULES.md` it touches, tests and verification it needs.
- **Overlap:** another feature that does the same job.

## 3. Verdict per feature

**behalten**, **verbessern** (the concrete change), **zusammenlegen** (with which), or **entfernen** (what it frees: lines, dependencies, complexity). Verdicts that cut need evidence of low use or high cost, not taste.

## Reply

A table (feature, goal served, use, cost, verdict), then the three changes with the best value-for-effort, the total lines and dependencies that could go, and what you could not measure. Removed features with a lasting reason go to `.out-of-scope/<slug>.md` once the user agrees.
