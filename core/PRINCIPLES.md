# Tstack principles

Adopted from pstack (`skills/principle-*`, MIT, see QUELLEN.md). Each entry: **when** it applies, then the rule. Apply every entry whose "when" matches the work in front of you. Entries marked *core rules* are already in the injected rules; they are listed so the index is complete.

## Core

- **Laziness Protocol.** When: sizing a diff, refactoring, tempted to add an abstraction, a layer or a threaded signal. Rule: the smallest change that solves the problem. Consolidate decisions: one choice lives in one place (one source of truth), everything else reads the result as a plain value or flag. A choice repeated in two places is a defect.
- **Build the Lever.** When: any non-trivial work, not only bulk work: edits, migrations, analyses, checks. Rule: build the tool that does or proves the work (codemod, script, generator, rerunnable check, or a skill your delegates follow) instead of working by hand. The bar is triviality, not repetition; skip the tool only for a couple of obvious edits.
  - Do the first unit by hand, then build the tool and prove it by rerunning it on that unit. Make it safe to rerun.
  - A deterministic tool beats fan-out. When you fan out, write the recipe, the verification contract and the fences as one skill the delegates read and cannot edit.
  - Applying it produces a file. No script, codemod, generator, check or delegate skill in the diff means you did not apply it. Commit the tool when the work outlives the session.
  - Build the smallest script that does or proves the job, never a framework.
- **Foundational Thinking.** When: before writing logic. Rule: get the data shape right first: core types, every access pattern, structures that fit the dominant path. Scaffold first (CI, tests, shared types), after removing dead code.
- **Redesign from First Principles.** When: integrating a new requirement into an existing design. Rule: redesign as if it had been a foundational assumption from day one; propagate it through types, docs and examples; deliver incrementally.
- **Attack the Premise.** When: two fixes sharing one premise failed the same gate. Rule: *core rules* (write the premise down, test it directly before the next fix).
- **Subtract Before You Add.** When: sequencing an addition, refactor or rewrite. Rule: remove dead weight first, then build on the simpler base. No speculative validators, parsers or guards.
- **Minimize Reader Load.** When: shaping or reviewing code that is hard to trace. Rule: collapse one-caller wrappers and pass-through layers; shrink mutable scope (returns over mutation, locals over fields over globals); derive instead of sync.
- **Outcome-Oriented Execution.** When: planned rewrites and migrations with phase boundaries. Rule: converge on the target state; no long-lived compatibility code for intermediate states; declare where temporary breakage is allowed.

## Architecture

- **Model the Domain.** When: stateful logic, heavy branching, a shape assumption repeated across files. Rule: encode the domain in a structure (state machine, typed model, registry, reducer) instead of scattered conditionals. Keep boring code where the shape is local and stable.
- **Boundary Discipline.** When: wiring validation, error handling, framework adapters. Rule: validate and parse at system boundaries, trust internal types inside; business logic in pure functions, a thin shell calls them.
- **Type System Discipline.** When: designing types or a signature in a typed language. Rule: make illegal states unrepresentable, brand primitives, parse external data at the boundary.
- **Make Operations Idempotent.** When: commands, lifecycle steps or loops that run amid crashes and retries. Rule: derive each step from the state that exists, apply only the difference; leftovers (locks, temp files) are recognizable as stale; write to a temp path and rename into place.
- **Migrate Callers, Then Delete Legacy APIs.** When: a new internal API while old callers exist. Rule: migrate every caller and delete the old API in one wave; tests assert the new contract.
- **Separate Before Serializing Shared State.** When: concurrent actors might write the same file, branch or key. Rule: give each actor its own file, key or branch and merge where it is read; serialize (lock, single writer) only when one shared target is a real invariant.

## Verification

- **Prove It Works.** When: before declaring done. Rule: *core rules*. Script the check when you can: a rerunnable script beats a one-time look.
- **Fix Root Causes.** When: debugging. Rule: fix the first place the system did something wrong, not where it surfaced. A guard is a fix only when the state it handles is legitimate; guards, retries, swallowed errors and clamped values hide bugs.
- **Sequence Verifiable Units.** When: multi-step work, sweeps, migrations, stacking commits. Rule: each unit is known-good state, one change, the check, then the next. Failing test before the fix, subtraction before the reshape, baseline before the treatment.
- **Test Behavior, Not Implementation.** When: writing, changing or keeping a test. Rule: assert what users of the interface observe. A test that passes when the behaviour breaks, or fails when only internals change, is fixed or deleted.
- **Explain the Number.** When: before you measure, and before you trust or report a measured number. Rule: write the decision the result would change and the noise floor first; name what limits the number; rule out that it measured something else (errors, cached or skipped work, noise).

## Delegation

- **Guard the Context Window.** When: large outputs, long files, repeated reads, fan-out. Rule: route bulk to subagents and headless workers, keep summaries in the main thread, keep decisions in files. Never ask the user to manage the session.
- **Never Block on the Human.** When: tempted to ask "should I do X?" about reversible work. Rule: do it, then present it. Irreversible actions still need confirmation.

## Meta

- **Encode Lessons in Structure.** When: you write the same instruction a second time, or the user corrects the same mistake twice. Rule: encode it as architecture, a type, a lint or check whose error names the fix, or a test, not as more text (`/tstack:retro`). Only judgement calls stay prose.
