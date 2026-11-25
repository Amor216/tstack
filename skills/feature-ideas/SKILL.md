---
name: feature-ideas
description: Generate new feature ideas grounded in the product's goal, its users, what exists today and what comparable products do; rank them by value, effort and fit, and hand the best to /feature-design. Use for "Feature-Ideen", "was könnte ich noch bauen", "neue Ideen", "was fehlt noch".
---

## 1. Ground

Look up, do not ask: the product goal (AGENTS.md, README), the current features (`/tstack:inventory` output or a quick scan of entry points), open specs and plans, `.out-of-scope/` (never re-propose what was rejected, unless the reason no longer holds; then say why). For comparable products or technologies, use `/tstack:research` or `/tstack:how-it-works` in the background; cite what you use.

## 2. Diverge

Produce 10–15 ideas from different angles, each in one line plus the user it serves:
- the core loop: what makes the main job faster, safer or more pleasant
- friction: workarounds, repeated manual steps, error-prone moments in today's product
- data the product already has but does not use
- what comparable products do well (named, with source)
- removal: a feature whose removal would improve the product
- one deliberately bold idea

## 3. Converge

Score each: value for the goal (high/mid/low, with the reason), effort (S/M/L from the code you looked at), fit with the current modules (`MODULES.md`), and evidence (real signal or guess). Drop what scores low on value. Present the top five as a table, then your one recommendation and why.

The user picks; the picked idea goes to `/tstack:feature-design`, rejected ones with a lasting reason go to `.out-of-scope/<slug>.md`.
