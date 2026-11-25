---
name: prototype
description: Build throwaway code that answers one design question: a single HTML file to drive a logic or state model, or several radically different UI variants switchable on one route. Kept on a prototype branch, never merged. Use when a question can only be settled by seeing or trying something ("wie soll das aussehen", "fühlt sich das richtig an", "prototyp", "zeig mal Varianten"), or when /grill hits an ungrillable question.
---

# Prototype

A prototype is **throwaway code that answers a question**. The question decides the shape.

## Pick a branch

Identify which question is being answered, using the user's prompt, the surrounding code, or by asking if the user is around:

- **"Does this logic / state model feel right?"** → [LOGIC.md](LOGIC.md). Build a single shareable HTML file (free-play buttons plus tabbed guided walkthroughs) that pushes the state machine through cases that are hard to reason about on paper, and that a non-developer can drive.
- **"What should this look like?"** → [UI.md](UI.md). Generate several radically different UI variations on a single route, switchable via a URL search param and a floating bottom bar.

The two branches produce very different artifacts, so getting this wrong wastes the whole prototype. If the question is genuinely ambiguous and the user isn't reachable, default to whichever branch better matches the surrounding code (a backend module → logic; a page or component → UI) and state the assumption at the top of the prototype.

## Rules that apply to both

1. **Throwaway from day one, and clearly marked as such.** Work in its own worktree on a branch `prototype/<name>` (`git worktree add`), never on the working branch. Locate the code close to where it would be used, named so a casual reader can see it's a prototype. For throwaway UI routes, obey the project's routing convention.
2. **Trivial to run.** A UI prototype starts from one command in the project's task runner (`pnpm <name>`, `python <path>`, …). A logic demo is a single HTML file the user double-clicks.
3. **No persistence by default.** State lives in memory. If the question explicitly involves storage, use a scratch DB or a local file with a clear "PROTOTYPE, wipe me" name.
4. **Skip the polish.** No tests, no error handling beyond what makes the prototype _runnable_, no abstractions. The point is to learn something fast.
5. **Prove it runs.** Before handing it over, start it once with its one command (or open the HTML) and confirm it renders and every control changes the shown state. A prototype that does not start answers nothing.
6. **Surface the state.** After every action (logic) or on every variant switch (UI), print or render the full relevant state so the user can see what changed.
7. **Capture it when done.** Commit the prototype on its `prototype/<name>` branch as a primary source; it is never merged. Write the verdict (the question and the answer) into the spec or decision it served, with a pointer to the branch; a rejected direction goes to `.out-of-scope/<slug>.md`. Only the validated decision reaches the real code, via `/tstack:spec`.

The hooks do not require the project verification on `prototype/*` branches; end with `Verdict: NOT VERIFIED – prototype, <start command> rendered and every control changed the state`.

Reply: the question, how to start the prototype (one command or file path), the branch, and what the user should look at.
