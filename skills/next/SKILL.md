---
name: next
description: Recommend the next Tstack skills for a goal, in order, with one reason each, without doing the work. Use when the user asks "what next", "was als nächstes", "welcher Skill", "wie gehe ich das an", or is unsure which step comes now.
---

Read [MAP.md](MAP.md). Infer the goal and the current state from the message, the conversation and the repo (git status, `specs/`, `MODULES.md`, a verify skill). Look facts up; ask the user only for a decision, in one question.

Reply in this shape and stop; do not start the work:

```
Ziel: <one line>
Stand: <what exists already, from the repo>

1. /<skill> – <why this step now, one line>
2. /<skill> – <why>
...

Automatisch: <which steps can run without the user, and whether /get-it-done or turbo fits, per the build rule>
Start: <the exact first command, with the prefix as in the skill list>
```

Name only skills in your skill list; for a missing one give its fallback from the map. Keep the list to the steps that change the outcome; skipping a step needs a reason in the reply.
