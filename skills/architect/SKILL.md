---
name: architect
description: Design how a change fits the architecture (deep modules, seams, one owner per state), improve an existing architecture, and keep MODULES.md current. Use before non-trivial code, when the user says "architect", "Architektur", "wie bau ich das ein", "improve architecture", or when /spec needs a module plan.
---

Use the deep-module vocabulary from the core rules exactly. Read the project's `MODULES.md`, `GLOSSARY.md` and `docs/adr/` first. No `MODULES.md` → create it per [MODULES-FORMAT.md](MODULES-FORMAT.md) before anything else, from the code, not from memory.

## Fit a change

1. Trace every module the change touches, by reading the code, not by guessing.
2. Sketch two different shapes (types, signatures, module seams). Pick the one where each piece of state has one owner, each task has one way to do it, and callers need to know least. Prefer deepening an existing module over adding one.
3. Classify each dependency per [DEEPENING.md](DEEPENING.md); it decides how the module is tested across its seam.
4. Large or contested shape (several modules, a new public interface, two sketches tie): run [DESIGN-IT-TWICE.md](DESIGN-IT-TWICE.md) instead of sketching alone.
5. Output: the chosen shape, the modules and interfaces that change, the test seam, and the planned `MODULES.md` change. If workarounds repeat, redesign as if the requirement had been there from day one, instead of patching.

## Improve the architecture

1. Scope first: the module the user named, else the hot spots in `git log --oneline` (files that keep changing).
2. Spawn one sub-agent with a fresh context to walk that scope and note friction: one concept spread over many small modules, shallow interfaces, logic extracted for tests while bugs hide in the callers, coupling that leaks across seams, untested or untestable parts. Apply the deletion test to every suspect.
3. Write the candidates as a self-contained HTML report per [HTML-REPORT.md](HTML-REPORT.md) to the OS temp dir, open it, give the path. Each candidate: modules, problem, solution, benefit in locality and leverage, before/after diagram, strength (`Strong`, `Worth exploring`, `Speculative`). End with the top recommendation. No interfaces yet.
4. Ask which candidate to pursue. Then read `../grill/SKILL.md` and grill the chosen one; for alternative interfaces use DESIGN-IT-TWICE. A rejected candidate with a lasting reason goes to `.out-of-scope/<slug>.md` so it is not proposed again.
5. Every candidate neither chosen nor rejected goes to the `Kandidaten` list in `MODULES.md`, one line each, so no finding is lost. Next run of this mode: start from that list, drop what the code has fixed meanwhile.
6. The decided restructuring goes to `/spec`; this skill does not rewrite code. Once its spec is written, name the next open candidate in one line and offer to grill it.

## Keep MODULES.md current

After any decided change, update the graph, the rows and the "Geplant" list. A module without a test seam is marked "keine" and reported.

Reply: the decision (or the report path), the modules and interfaces affected, and what stays unverified.
