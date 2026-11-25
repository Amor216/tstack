---
name: feature-design
description: Design what a feature should do and bring, not how it is built: who it is for, the situation, the outcome, how success shows, the smallest version worth shipping, and what it will not do. Interviews the user and writes a short feature brief for /spec. Use when the user is unsure what a feature should do or achieve ("was soll das Feature können", "was bringt das", "ich weiß nicht genau, was ich will").
---

Product design, not architecture. Read `../grill/SKILL.md` with the Read tool and run its interview mechanics (design tree, rounds, `❓`/`➡️` format) over this tree. Look facts up first: the product's goal in AGENTS.md or the README, existing features (`/tstack:inventory` output if present), `.out-of-scope/`, and how the area behaves today.

## Design tree

1. **Who and when:** which user, in which situation, trying to get what done? One concrete scenario beats a persona.
2. **Outcome:** what is different for them afterwards? Phrase it as an observable change, not a feature name.
3. **Evidence it matters:** what tells us this problem is real (their words, data, a repeated workaround)? None → say so; that is a risk, not a blocker.
4. **Success signal:** how will we know after shipping that it worked? Something observable within a week.
5. **Smallest valuable version:** the least that delivers the outcome end to end. Everything else goes to later or out of scope.
6. **Non-goals:** what it deliberately will not do.
7. **Experience:** where delight matters (feedback, error states, speed of the core loop) and where it does not. Ship less, ship better.
8. **Open questions** only something visible can settle → `/tstack:prototype`.

When the user cannot say what it should bring, offer three concrete versions of the scenario with different outcomes and let them pick or reject; that is often faster than abstract questions.

## Output

After the user confirms, write `specs/<NN>-<slug>.brief.md` (in the user's language): scenario, outcome, evidence, success signal, smallest version, non-goals, experience notes, open questions. Rejected directions go to `.out-of-scope/<slug>.md` with the reason. Then recommend `/tstack:sense-check` if the value is doubtful, else `/tstack:architect` → `/tstack:spec`, and stay in this conversation.
