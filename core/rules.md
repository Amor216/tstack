# Tstack core rules

These rules hold for every task in this session and in every agent it starts.

## The smallest complete change

Read the task and the code it touches. List every place your change must reach: callers, tests, fixtures, config, exports. Check what your change could break for users: data it would destroy or expose, callers that stop working. That is scope. Extra features are not.

Take the first option that fully works:

1. Does it need to exist? Skip features, options and flexibility nobody asked for, and name them in one line. A vague request ("build me X") gets the smallest version that does the core job.
2. Already in this codebase (a helper, component, service, pattern)? Use it the way the surrounding code does.
3. Standard library or a platform feature? Use it, unless the project has its own. A house component beats a native widget.
4. An installed dependency? Use it. Never add a dependency for a few lines.
5. Can it be one line a reader gets at a glance? One line.
6. Otherwise: the minimum code that works.

- Be lazy about the solution, never about the change itself: finish every part the task needs, including the callers, tests and fixtures your change breaks.
- No abstraction, wrapper, type conversion, option, config, boilerplate or "for later" code nobody asked for. Keep values in the form the platform already gives you. Deletion beats addition. Keep the structure the codebase already has: its layers, interfaces and conventions. What a spec or MODULES.md decided counts as asked for.
- The shortest working diff wins, once you know everything it must touch. A one-liner that needs decoding is not short.
- No comments, except license headers, behaviour forced from outside, public API docs, issue/RFC links and `shortcut:` markers. Names carry the why.
- Bug fix: before you edit, grep every caller of the function you touch, then fix the root cause once in the shared code.
- Code you move or merge keeps its error handling and validation.
- Between options of equal size, take the one that is correct on edge cases.
- A shortcut with a known limit gets a code comment in this form: `shortcut: <the limit>, <when to upgrade>`.

Never cut: validation at trust boundaries, error handling that prevents data loss, security, accessibility, the calibration real hardware needs, anything the user asked for.

## Deep modules

Design deep modules: a lot of behaviour behind a small interface, placed at a clean seam, testable through that interface. Use these terms exactly.

- **Module**: anything with an interface and an implementation (function, class, package, slice).
- **Interface**: everything a caller must know to use the module correctly: types, invariants, ordering, error modes, configuration, performance.
- **Depth**: behaviour a caller can exercise per unit of interface it has to learn. Deep = large behaviour behind a small interface; shallow = interface nearly as complex as the implementation.
- **Seam**: the place where a module's interface lives; you can alter behaviour there without editing in that place.
- **Adapter**: a concrete thing that satisfies an interface at a seam.
- **Leverage**: what callers get from depth. **Locality**: what maintainers get: change, bugs and verification concentrate in one place.

- The deletion test: imagine deleting the module. If complexity vanishes, it was a pass-through. If it reappears across N callers, it earns its keep.
- The interface is the test surface. Callers and tests cross the same seam.
- One adapter means a hypothetical seam. Two adapters means a real one.
- A new feature first deepens an existing module, else gets a new module with a small interface. Never a shallow helper. Split by job, never by line count.

## Verification loop

Verify every output by checking the real thing directly: run the feature, read the actual value, inspect the diff. Proxies (file mtimes, self-reports, cached output, "it compiles") do not count. When a check fails, suspect the observation method before the system.

- Every change that touches code ends in a loop: run the project's end-to-end verification (the AGENTS.md `Verify:` command), fix, run it again, until it passes. The step's own check runs too. No `Verify:` line yet: run `/tstack:verify-setup` first. Can't prove the change: name the gap; on OK run `/tstack:verify-maintain`, then continue.
- A check you have never seen fail proves nothing. For new checks, see it fail once first.
- Never relax a check to declare done. After two failed attempts on the same premise, write the premise down and test it directly.
- A verdict is VERIFIED, NOT VERIFIED or BLOCKED. Inconclusive is not a pass.
- In a subagent or a `claude -p` run, never ask the user: finish what you can and report BLOCKED with the missing fact or decision.

## Working

- Multi-line edits only with the Edit and Write tools, never via shell quoting (heredoc, sed, `node -e`).
- Commit each verified unit. Unit or phase done and commits unpushed: offer the push in one line, unless the project pushes every commit.

## Reply

- Write in the user's language, also every progress note between tool calls.
- Blank line between paragraphs, list items and sections; one point each.

End with one or two lines: what you verified and how, what you skipped or did not check, and any risk the user must know. Report net lines changed for refactors. When code changed, the last line is `Verdict: VERIFIED|NOT VERIFIED|BLOCKED – <check command and its result>`.
