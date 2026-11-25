# Tstack — Quellen

Gelesener Stand (2026-11-22), alle MIT:

| Kürzel | Repo | Commit | Copyright |
|---|---|---|---|
| PS | github.com/cursor/plugins (`pstack/`) | 7a58391 | 2026 Lauren Tan |
| MP | github.com/mattpocock/skills | abeeaf9 | 2026 Matt Pocock |
| PT | github.com/dietrichgebert/ponytail | ebd8654 | 2026 DietrichGebert |

Wörtlich übernommene Dateien behalten ihren Copyright-Hinweis (`NOTICE`). Beim Bauen jeden Skill aus den
Originaldateien übernehmen, nicht aus dieser Zusammenfassung.

Urteil: **W** wörtlich, **A** anpassen, **I** nur Idee.

## Kern

| Quelle | Urteil | Hinweis |
|---|---|---|
| PT `skills/ponytail/SKILL.md` (= `.agents/rules/ponytail.md`) | W | Regelsatz; Levels lite/full/ultra weglassen |
| PT `hooks/ponytail-activate.js`, `ponytail-subagent.js`, `ponytail-runtime.js` | A | nur nativer Claude-Zweig; SubagentStart braucht `hookSpecificOutput`-JSON; Windows: Fallback-Timer muss ref'd bleiben |
| PT `hooks/claude-codex-hooks.json` | W | Registrierung per `node -e "require(...CLAUDE_PLUGIN_ROOT...)"` |
| PT `hooks/ponytail-map.js` | A | Codebase-Map, mit `MODULES.md` koppeln |
| PT `scripts/check-rule-copies.js` | A | Lint: Kernphrasen in allen Skills |
| MP `skills/engineering/codebase-design/SKILL.md` | W | Modul-Vokabular |
| PS `agents/comment-sicko.md` | A | Kommentarregel: keine Kommentare außer der Erlaubt-Liste |
| MP `skills/productivity/writing-for-agents/SKILL.md`, `SKILL-MECHANICS.md` | W | Schreibregeln für Skills |
| PS `skills/poteto-mode/worker.md` | W | PR-Teil → Commit + Push |
| PS `skills/principle-*` | A | als Index `core/PRINCIPLES.md` (je „wann“ + Regel, gekürzt; Build the Lever und Laziness Protocol vollständig); Stand bis 2026-11-25 war nur Prove It Works wirklich übernommen. Enthalten: laziness-protocol, guard-the-context-window, never-block-on-the-human, encode-lessons-in-structure, type-system-discipline, migrate-callers-then-delete-legacy-apis, prove-it-works, fix-root-causes, attack-the-premise, subtract-before-you-add, sequence-verifiable-units, test-behavior-not-implementation, boundary-discipline, model-the-domain, minimize-reader-load, make-operations-idempotent, separate-before-serializing-shared-state, build-the-lever, explain-the-number, foundational-thinking, redesign-from-first-principles, outcome-oriented-execution |
| PS `skills/show-me-your-work/` (SKILL, `scripts/log.sh`, TSV-Vorlage) | W | Lauf-Log; Transkript-Pfad `~/.claude/projects/` |
| PS `skills/unslop/SKILL.md`, `technical-writing/SKILL.md` | A | Prosa-Regeln; Englisch-spezifische Regeln beachten |
| MP `skills/misc/git-guardrails-claude-code/` | A | Muster für PreToolUse-Hook; `git push` nicht blockieren |
| MP `scripts/check-frontmatter.mjs` | W | CI für Tstack |

## Skills

| Skill | Quellen |
|---|---|
| `/grill` | MP `productivity/grilling/SKILL.md` (W, Emojis ersetzen), `grill-me` (I: „ungrillable → prototype“) |
| `/grill-docs` | MP `engineering/grill-with-docs`, `domain-modeling/` inkl. ADR-FORMAT, GLOSSARY-FORMAT (W: ADR-Dreier-Regel). Inhalt einbetten statt nur zu delegieren |
| `/brainstorm` | MP `engineering/wayfinder` (I), PS `sharpen` (W) |
| `/spec` | MP `engineering/to-spec`, `to-tickets` (A: Slices in einer Datei, Expand–Contract, Prefactoring zuerst), MP `in-progress/loop-me` (A: Definition of Done), PS `poteto-mode/playbooks/multi-phase-plan.md` (A), PS `poteto-help/references/prompting.md` (A: Done-Check), MP `triage/AGENT-BRIEF.md` (A: Brief-Format) |
| `/slop-audit` | PT `skills/ponytail-audit` (A), MP `improve-codebase-architecture/HTML-REPORT.md` (A), PS `unslop` |
| `/modularize` | MP `codebase-design/DEEPENING.md` (W), PS `playbooks/refactoring.md` (W), MP `in-progress/setup-ts-deep-modules` (W für TS; Python-Gegenstück nötig) |
| `/architect` | MP `codebase-design/` inkl. `DESIGN-IT-TWICE.md` (W), MP `improve-codebase-architecture` (A), PS `architect` (W) |
| `/verify-setup` | PS `create-verification-skill/` inkl. `references/feature-map-example/` (W, `.cursor` → `.claude`), PS `create-formal-verification-skill` (A, optional), PS `automations/benny/control-adapter.md` (I) |
| `/verify-maintain` | PS `maintain-verification-skill` (W), PS `maintain-formal-verification-skill` (A) |
| `/get-it-done` | MP `engineering/implement-spec` (A: `claude -p` statt Subagents), MP `implement` (A: Worker-Prompt), PS `swarm` (A: PASS/ISSUES/BLOCKED, ein Neustart), PS `playbooks/autonomous-run.md` (W), `autopilot-full.md` (A: Watchdog), `hillclimb.md` (W: Metrik-Modus), `session-pickup.md`, `pause-safely.md` (W), `worktree-cleanup.md` + `scripts/worktree-audit.sh` (A), PS `principle-guard-the-context-window`, MP `productivity/handoff` (W), MP `in-progress/software-factory` (A: Bremsen, Rework-Cap), PT `benchmarks/agentic/run.py` (A: Starten/Auswerten von `claude -p`), MP `docs/engineering/resolving-merge-conflicts.md` (I) |
| `/tstack` | PS `poteto-mode/SKILL.md` (A: Gerüst, Trigger-Tabelle, Prinzipien-Index), PS `playbooks/feature.md` (A: Throughput-Checkpoint), PS `figure-it-out` (A), PS `recall` (A) |
| `/research` | MP `engineering/research` (W; Rekursion verhindern) |
| `/code-review` | MP `engineering/code-review` (W, + Lean-Achse), PT `skills/ponytail-review` (W), PS `interrogate` (W-Kern), PS `blast-radius` (W), PS `agents/comment-sicko.md` (W) |
| `/simplify` | eingebautes `/simplify`, PT-Regelsatz, PS `principle-minimize-reader-load` |
| `/bugfix` | MP `engineering/diagnosing-bugs` + `scripts/hitl-loop.template.sh` (W), PS `playbooks/bug-fix.md` (W), PS `playbooks/perf-issue.md` (W: Mantras) |
| `/retro` | MP `engineering/retro` (W), PS `reflect` (A: Backlog → Hook/Lint/Test), PS `correct` (W), PS `playbooks/eval.md` (W: Skill-Änderungen blind testen), PT `.github/CONTRIBUTING.md` (W: Regeländerung nur mit Messung) |
| `/tdd` | MP `engineering/tdd/` inkl. `tests.md`, `mocking.md` (W), PS `tdd` (W), PS `principle-test-behavior-not-implementation` (W) |
| `/parallel` | wie `/get-it-done turbo` |
| `/prototype` | MP `engineering/prototype/` inkl. `LOGIC.md`, `UI.md` (W), PS `playbooks/prototype.md` (W) |
| `/next` | MP `engineering/ask-matt` (A), `PHASE-BOUNDARIES.md` (A: Orchestrator verwaltet den Kontext selbst, keine /clear-/compact-Bitten an den User), PS `poteto-help/` inkl. `references/recipes.md` (A) |
| `/leichtbau` | PT `skills/ponytail` (W), `ponytail-debt` (W), PT `examples/` (I) |
| `/workspace` | bestehendes `~/.claude/skills/new-project` |
| `/feature-design` | MP grilling-Mechanik, MP `in-progress/loop-me` (I) |
| `/sense-check` | PS `principle-experience-first` (W), MP `.out-of-scope/`-Muster (I) |
| `/how-it-works` | PS `how`, `why` (A) |
| `/feature-ideas` | MP `wayfinder` (I), MP `triage/OUT-OF-SCOPE.md` (I) |
| `/feature-audit` | neu |
| `/inventory` | PT `hooks/ponytail-map.js` (A) |
| Stack messen (Phase 7) | PT `benchmarks/agentic/` (run.py, tasks.py, judge.py, compare.py, answer.py; Selbsttest der Instrumente) |

## Bewusst nicht übernommen

- PS: `poteto-mode/scripts/watch-pr`, Playbooks babysit/shipping/autopilot-stack/opening-a-pr (PR-zentriert),
  `statechart` (Java/TLA+), `automations/benny` (Slack/Cursor), `setup-pstack`, Modell-Panels, `ketchup-video`, `make-bot-ui`.
- MP: `setup-matt-pocock-skills`, `triage`, `teach`, `writing-*`, `migrate-to-shoehorn`, `scaffold-exercises`, `agents/openai.yaml`.
- PT: Levels, Adapter für andere Tools und Regelkopien, „Band“ (läuft nicht in `claude -p`), `ponytail-gain`, Single-Shot-Benchmark.

## Erkenntnisse aus dem Lesen

- SessionStart-Hooks feuern auch in `claude -p` (PT `benchmarks/results`, Kontamination der Baseline).
- SessionStart erreicht keine Subagents, dafür gibt es SubagentStart (PT `hooks/ponytail-subagent.js`).
- Konkrete Anweisungen schlagen Prosa (PT `benchmarks/results/2026-06-22-…comprehension.md`).
- Gegen-Anweisungen in Skills bringen nichts ohne Messung (PT robustness-audit).
- Worktrees verschieben Konflikte nur bis zum Merge (MP implement-spec).
- Subagent-Rekursion und endlose Review-Schleifen sind dokumentierte Fehler (MP docs research, code-review).
- `disable-model-invocation` versteckt Skills vor Routern (MP docs ask-matt).
- In `claude -p` gibt es kein Frage-Tool (PS `docs/harness/claude-code.md`).
