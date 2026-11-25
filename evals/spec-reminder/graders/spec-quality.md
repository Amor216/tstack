---
type: llm
focus: {source: file, path: specs/01-erinnerung.md}
---
PASS only if all hold:
1. It has numbered steps, each with blocked-by edges, a mode (auto/manual) and a concrete check command a worker could run without a human.
2. Each step is a vertical slice that delivers observable behaviour (not "add a function" then separately "add tests").
3. It names which existing module takes the feature (e.g. the store) instead of inventing a new layer, and lists nothing that was ruled out (no background service, no system notifications).
4. Steps that could run in parallel do not touch the same file, or have an edge between them.
Otherwise FAIL.
