---
name: research
description: Research a question against primary sources (official docs, source code, specs, papers, first-party APIs) in a background agent and leave one cited Markdown file. Use when a decision needs facts from outside the repo, to learn how another technology or product works, or when the user says "recherchier", "research", "find out", "was sagen die Docs".
---

Spin up a **background agent** to do the research, so you keep working while it reads. Start it with a fresh context window and tell it not to spawn further agents.

Its job:

1. Investigate the question against **primary sources** (official docs, source code, specs, papers, first-party APIs), not a secondary write-up of them. Follow every claim back to the source that owns it, and note the date or version the source describes.
2. Write the findings to a single Markdown file: the question, the answer in a few lines, then the evidence, each claim with its source link. Mark inferences as inferences and list what the sources do not answer.
3. Save it where the repo already keeps such notes; none → `docs/research/<yyyy-mm-dd>-<slug>.md`, and say where.

When it reports back, read the file, check two of its claims against their sources yourself, and give the user the answer, the file path and what stays open. Research feeds a decision (`/tstack:grill`, `/tstack:spec`, `/tstack:brainstorm`); it does not replace it.
