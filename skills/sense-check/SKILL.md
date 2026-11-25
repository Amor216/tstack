---
name: sense-check
description: Judge whether what is being built right now actually serves the goal: link to the goal, evidence, cost against value, a simpler or better alternative, and a clear verdict (continue, reshape, stop). Honest, not validating. Use when the user doubts the current work ("macht das Sinn", "bringt das was", "ist das sinnvoll", "verrenne ich mich"), before a long /get-it-done run, or when a spec grows far beyond its first idea.
---

## 1. Pin goal and work

- **Goal:** the user's own words if they gave one; else the product goal from AGENTS.md or the README, the spec's problem statement, or the brief from `/tstack:feature-design`. State it in one line and ask only if none of these exists.
- **Work:** what is being built: the spec, the diff since the branch started (`git log`, `git diff --stat`), open plans. Look it up; do not ask.

## 2. Judge

Answer each with evidence (file, commit, quote, number), or mark it as a guess:
1. **Link:** which part of the goal does this work move, and how directly? Parts that move nothing are named.
2. **Evidence:** what shows the problem is real and this solves it? Users, data, a measured pain; or only an assumption.
3. **Cost:** size so far and to finish (steps, lines, dependencies, maintenance), plus what it blocks or delays.
4. **Alternatives:** a simpler version, an existing tool or feature, or not doing it. Name the strongest one concretely.
5. **Drift:** has the scope grown past the original intent? Quote the original intent.

## 3. Verdict

One of:
- **Weiter:** it serves the goal; the one risk to watch.
- **Umbauen:** keep the goal, change the work; the concrete cut or reshape and what it saves.
- **Stoppen:** it does not earn its cost; what to keep from the work done, and what to do instead.

Record a stopped or cut part in `.out-of-scope/<slug>.md` with the reason, so it is not proposed again. Reply in at most twelve lines: goal, verdict, the three strongest reasons with evidence, the next command.
