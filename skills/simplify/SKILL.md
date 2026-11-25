---
name: simplify
description: Tstack simplify (not the built-in /simplify). Clean up the changed code and apply the fixes: reuse what exists, delete what is not needed, lower reader load, cut comments that narrate, make hot paths efficient, without changing behaviour. Net lines must not grow. Use after a build or review, or when the user says "simplify", "vereinfach das", "räum den Code auf".
---

Scope: the diff the user names; nothing named → uncommitted changes, else `git merge-base HEAD main`..HEAD. `/tstack:simplify` cleans a diff; shrinking a whole path or folder is `/tstack:leichtbau`. Behaviour stays the same; features and bug fixes are split out.

## 1. Pin behaviour

Find the check that covers the touched code (the step's check, the tests, the AGENTS.md `Verify:` command) and run it. Green before you start, or stop and report. No check covers it → write a characterization test first.

## 2. Find the cleanups

For each changed hunk and the code it calls:
- **Reuse:** grep for an existing helper, component or pattern that already does this; name its path.
- **Ladder cases** (delete, stdlib, merge): as in `../leichtbau/SKILL.md` step 3, limited to the diff.
- **Reader load:** layers a reader must hop through, hidden or widely mutable state, names that need decoding. Split by job, never by line count.
- **Comments:** keep only what [COMMENTS.md](COMMENTS.md) allows; a comment explaining our own surprise means the code should change instead.
- **Efficiency:** work repeated in a loop, a query per item, a list that only grows.

Every candidate needs a concrete reason; no style taste.

## 3. Apply

One cleanup at a time, re-running the check after each. A cleanup that turns the check red, or does not lower reader load, is reverted. Migrate every caller in the same change; no compatibility shims.

## 4. Reply

The cleanups applied (one line each), the ones skipped and why, `Net lines: <N>` (production code, must be ≤ 0; pin tests reported separately as `+<M> test lines`), and the Verdict line with the check you ran.
