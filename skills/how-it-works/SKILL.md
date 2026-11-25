---
name: how-it-works
description: Explain how a part of this codebase works and why it is built that way, for a senior engineer, from the code and the git record, with sources. Use for "wie funktioniert", "how does X work", "warum ist das so gebaut". Other technologies and products: /research.
---

State your reading of the question in one line, then pick the mode. The user can redirect.

## In this codebase (how)

Spawn one read-only subagent with a fresh context and this brief: "You are writing an architectural explanation for a senior engineer. Explore the codebase and write an explanation that a senior engineer unfamiliar with this area could read and walk away with a solid mental model, well enough to start working in it confidently. Do not edit files and do not spawn agents." Present its output with light edits only. Add a mermaid diagram when the flow crosses more than three modules.

## Why it is built this way (why)

Answer from the record, not the code: read the commits and the discussions that introduced the target and each later change (`git log -L`, `git log --follow`, linked issues), and other sources if the trail is thin. Cite what the authors wrote, mark your own inferences as inferences, and say what the record does not answer.

## Another technology or product

That is `/tstack:research` (primary sources, cited file). For a shipped binary or app, reverse engineering only for software the user owns or has permission to analyse.

Reply: the explanation (smallest answer first, then detail), the sources, what is inferred, and what it means for the user's goal if they named one.
