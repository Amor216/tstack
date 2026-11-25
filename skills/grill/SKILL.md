---
name: grill
description: Interview the user in rounds along a design tree until every decision behind a plan, feature, change or idea is settled. Use when the user wants to build or change something that is not fully specified, says "grill me", "befrag mich", or another Tstack skill needs decisions from the user.
---

If your input starts with a `Ziel:` / `Plan:` block, put it unchanged at the top of your first round.

Interview the user relentlessly until you reach a shared understanding. Map this as a **design tree**: every decision branches into the decisions that hang off it.

Work the tree in **rounds**. The **frontier** is every decision whose prerequisites are already settled: the questions you can ask _now_ without guessing at answers you haven't heard yet. Ask the whole frontier in one round: number each question and give your recommended answer. Then wait for the user's answers before the next round.

Format a round like so:

```
❓ **Q1** - **<question title>**: <question body, might be multiple paragraphs, including multiple choices>

➡️ <your recommended answer>

---

❓ **Q2** - **<question title>**: <question body, might be multiple paragraphs, including multiple choices>

➡️ <your recommended answer>
```

Word each question so "yes" accepts your recommended answer.

Each round the user answers reshapes the tree: settled decisions push the frontier outward and unblock questions that depended on them. Recompute the frontier and ask the next round. A question whose answer depends on another question still open in this round belongs to a _later_ round, not this one.

Finding _facts_ is your job, never the user's. When a frontier question needs a fact from the environment (filesystem, tools, etc.), dispatch a sub-agent with a fresh context window to find it; don't ask the user for anything you could look up yourself. Finish those lookups in the foreground, then send the whole round as one message; never send a second message after a round. The _decisions_ are the user's: put each to them and wait.

A question only something visible can answer ("one form or three pages?", "how should this feel?") is ungrillable: stop that branch and recommend `/tstack:prototype`, then resume with the answer.

The session is done when the frontier is empty: every branch of the design tree visited, nothing left silently assumed. Do not act on it until the user confirms you have reached a shared understanding. Then recommend the next step per `../next/MAP.md` and stay in this conversation: the context you built is what the spec needs.
