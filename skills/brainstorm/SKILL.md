---
name: brainstorm
description: Think an idea through with the user and chart the way to a destination when the effort is too big or too foggy for one session: name the destination, deepen the idea, lay out decision tickets (research, prototype, grill, task) in a local map, and resolve them one at a time. Plans, does not build. Use for "brainstorm", "lass uns überlegen", "Idee durchdenken", "wie fange ich das an", big unclear projects.
---

Wayfinding: find the way, don't charge at the destination. Each session produces decisions, not deliverables; the pull to just build is the signal the map is done and it's time for `/tstack:spec`.

## 1. Deepen the idea

Before charting, state in a few lines:
1. What a top professional in this field would do here that the user is not asking for.
2. The rawest material they would start from instead of what has already been digested.
3. The specific methods and tools they would use.
4. What, other than you or the user, would show the result is right.
Offer two or three genuinely different directions with one line of trade-off each. Check `.out-of-scope/` so a rejected idea is not proposed again.

## 2. Chart the map

Write `plans/<slug>/MAP.md` per [MAP-TEMPLATE.md](MAP-TEMPLATE.md): the destination (one or two lines: the spec, decision or change this effort is finding its way to), notes, decisions so far, open tickets, not yet specified (fog), out of scope. Each ticket is one decision sized to one session, typed:
- **research** (agent alone): facts from outside → `/tstack:research`
- **prototype** (with the user): how should it look or behave → `/tstack:prototype`
- **grill** (with the user): a decision by conversation → `/tstack:grill`
- **task**: work that must happen before a decision can be made (sign up for an API, move data to see its shape)
Give tickets blocked-by edges; the frontier is every open ticket whose blockers are resolved.

## 3. Work the frontier

One ticket at a time: run its skill, record the answer under the ticket and a one-line gist under "Decisions so far", unblock what depended on it, move fog that became concrete into tickets. Research tickets on the frontier run in parallel in the background. Never answer a grill ticket's decision yourself.

The map is done when nothing is left to decide before building. Then recommend `/tstack:feature-design` (if what the feature should do is still vague) or `/tstack:spec`.
