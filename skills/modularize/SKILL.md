---
name: modularize
description: Restructure code toward deep modules with high locality and leverage, removing slop, while behaviour stays the same: pin the behaviour, name the target shape, subtract first, move in small green steps, prove equivalence. Use to implement the target state from /slop-audit or /architect, or when the user says "modularisieren", "refactor", "Struktur aufräumen".
---

You own the contract. The structure changes. The behaviour does not. A missing feature or a real bug found on the way is split out (`/tstack:spec`, `/tstack:bugfix`) and the structural change ships first against the pinned contract. Restructuring across more than a few modules or more than one session → write it as a spec (`/tstack:spec`, expand → migrate → contract steps) and run `/tstack:get-it-done`.

1. **Pin the behaviour contract first.** Trace the affected modules, then write a characterization test, snapshot or equivalence harness that captures current behaviour before any structure moves. Type check and lint are not a pin.
2. **Name the target shape**, from `/tstack:architect` or the latest `.tstack/reports/slop-audit-*.html` if present, else here: the module layout, interfaces and call graph as if built today, each piece of state with one owner. Classify dependencies per [../architect/DEEPENING.md](../architect/DEEPENING.md). The reshape must delete branches, layers or invalid states, not add indirection.
3. **Subtract before you add.** Delete dead code, collapse one-caller wrappers, drop redundant validators and orphan references before introducing the new shape.
4. **Move in small behaviour-preserving steps**, each keeping the pin green, one commit each. Migrate every caller and delete the old interface in the same wave: no shims, no parallel old and new paths. Spot-check every rename against strings, docs and back-references. Old tests on removed shallow modules are replaced by tests at the new interface (replace, don't layer).
5. **Prove behaviour is unchanged** on the real artifact: the pin, the project's AGENTS.md `Verify:` command, and for larger reshapes an old-vs-new output diff.
6. **Keep it only if reader load dropped.** If the diff does not lower reader load somewhere, revert it.
7. Update `MODULES.md` (graph, rows, interfaces) in the same change.

Reply: the structure that changed, the pin, the equivalence proof, `Net lines: <N>` (production code, must be ≤ 0; pin tests reported separately as `+<M> test lines`), what shipped and what was reverted, and the Verdict line.
