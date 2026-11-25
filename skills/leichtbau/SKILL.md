---
name: leichtbau
description: Make code lighter: apply the minimal-code ladder to a file or folder and delete everything that does not need to exist; with "debt", list every `shortcut:` marker as a debt ledger. Behaviour stays, lines go. Use for /leichtbau, "minimier den Code", "weniger Code", "zu viel Code", "bloat", "Schulden zeigen".
---

`/tstack:leichtbau [path]` shrinks code. `/tstack:leichtbau debt` reports the shortcut ledger per [DEBT.md](DEBT.md) and changes nothing.

## Shrink

Scope: the path or folder the user names; nothing named → the files changed since `git merge-base HEAD main`. Cleaning only a diff is `/tstack:simplify`.

1. **Pin behaviour.** Run the covering check (tests, the AGENTS.md `Verify:` command, the step's check). Green first; no check → write a characterization test before any deletion.
2. **Walk the ladder from the core rules for every unit in scope** (function, class, module, option, dependency): does it need to exist? is it already in this codebase? does the standard library or platform do it? does an installed dependency do it? can it be one readable line? Take the first yes.
3. **Find the lean cases:** delete (dead code, unused options, flags, config, speculative features), reuse (name the existing path), stdlib/native, yagni (one-implementation interface, one-product factory, pass-through wrapper), merge (near-copies). Before calling anything unused, grep the whole tree including tests, fixtures, config and string references.
4. **Apply one deletion at a time**, re-running the check after each; red → revert that deletion. Never cut what the core rules list under "Never cut".
5. **Delete comments** the core rules do not allow ([COMMENTS.md](../simplify/COMMENTS.md)); a comment that explains our own surprise means rename or restructure instead.
6. A limit you keep on purpose gets `shortcut: <the limit>, <when to upgrade>`.

Reply: what was removed (one line each), what was kept and why, `Net lines: <N>` (production code, must be ≤ 0; pin tests reported separately as `+<M> test lines`), dependencies removed, and the Verdict line.
