# Tstack — Design

TurboStack: ein Skill-Pack für Claude Code, um schnell und ohne AI-Slop zu arbeiten. Kombiniert und
wiederverwendet pstack, mattpocock/skills und ponytail (alle MIT, Herkunft je Datei in `QUELLEN.md`).

Stand: 2026-11-22, freigegeben. Öffentlich als Plugin unter github.com/Amor216/tstack (seit 2026-11-25).

## Ziele

1. Schnell und exakt: lange Aufgaben laufen automatisch, viel parallel in Worktrees.
2. Kein Slop: minimaler Code (Ponytail), keine Duplikate, tiefe Module mit schmalem Interface, hoher
   Locality und hoher Leverage.
3. Verifikation in allem: jede Implementierung endet in einer Prüfschleife (prüfen → reparieren → prüfen),
   bis grün oder BLOCKED.
4. Ein Hauptskill, der den Weg kennt: der User muss den Stack nicht auswendig kennen.

## Ort und Aufbau

```
Home/
  AGENTS.md        Landkarte (Home Repo Pattern, aihero.dev)
  skills/          persönliche Skills (aus ~/.claude/skills umgezogen)
  tstack/          der Stack, im Plugin-Format
    .claude-plugin/plugin.json
    core/          gemeinsame Regeln (eine Quelle, per Hook geladen)
    skills/<name>/SKILL.md (+ Referenzdateien GROSS.md, scripts/)
    hooks/         SessionStart, SubagentStart, Stop
    scripts/       Orchestrator-Maschine, Lauf-Log
    DESIGN.md  QUELLEN.md  NOTICE
```

Als lokales Plugin installiert, damit es in jeder Session wirkt, auch in den Headless-Chats im
Projektordner. Veröffentlichen später = Repo öffentlich machen.

## Grundentscheidungen

| # | Entscheidung |
|---|---|
| E1 | Gefragt wird nur in den Klär-Skills (`/grill`, `/grill-docs`, `/feature-design`, `/spec` …). Ab `/get-it-done` fragt kein Chat mehr; ein Worker meldet BLOCKED statt zu fragen (in `claude -p` gibt es kein Frage-Tool). |
| E2 | Alles, was implementiert wird, braucht eine Prüfschleife. Jeder Spec-Schritt hat einen Prüfbefehl, der vorher nachweislich rot war. Unit-Tests dort, wo eine klare Prüfstelle existiert (`/tdd`), sonst Build, Typecheck, Smoke oder der projekteigene Verify-Skill. |
| E3 | Parallelität bestimmt der Abhängigkeitsgraph der Spec, pro Aufgabe. Bausteine, die dieselbe Datei ändern, bekommen eine Kante. |
| E4 | Jeder Schritt im eigenen Worktree-Branch; sind die Tore grün, Merge in den Integrationszweig; nach dem Review am Laufende und grüner Gesamtprüfung Fast-Forward von `main` und Push. Keine PRs. |
| E5 | Kernregeln werden per Hook immer eingespeist (blockiert nichts). Erzwungen wird nur die Prüfschleife: Stop-Hook lässt kein „fertig“ zu, wenn Code geändert wurde und kein Prüfergebnis vorliegt. |
| E6 | Skill-Texte auf Englisch (wörtliche Übernahmen bleiben wörtlich), Antworten an den User auf Deutsch. |
| E7 | Den Stack selbst messen (Ponytail-Benchmark-Methode) kommt in einer späteren Phase. |
| E8 | Spec und Tickets sind eine Datei: Spec mit Schritten. |
| E9 | Netto-Zeilen werden immer gemeldet. Pflicht ≤ 0 bei `/modularize`, `/simplify`, `/leichtbau`. |
| E10 | Regeln als konkrete Anweisungen, nicht als Prosa (Ponytail-Messung: „grep every caller“ 6/6, „trace the flow“ 0/3). |
| E11 | Tstack-Skills bleiben für das Modell sichtbar (kein `disable-model-invocation`), damit `/tstack` und `/next` sie aufrufen können. |
| E13 | Größen (nach Ponytail, Pocock, pstack, Claude-Code-Doku): Kern immer geladen ≤ ca. 5 KB; Skill meist 1–5 KB, höchstens 8 KB wenn ein Original wörtlich übernommen wird, Router `/tstack` ≤ ca. 12 KB; `SKILL.md` < 500 Zeilen; Details in Nebendateien, die nur bei Bedarf gelesen werden; wichtigster Auslöser vorn in der `description`; jeder Satz besteht den No-op-Test (Löschen ändert Verhalten). Geprüft per Lint. |
| E15 | `/tdd`: Eine Prüfstelle gilt als abgestimmt, wenn eine freigegebene Spec sie nennt oder vorhandene Tests dieses Interface schon nutzen; nur neue Prüfstellen werden mit dem User abgestimmt (Abweichung von Pocock, vom User bestätigt). |
| E14 | Keine Implementierung ohne End-to-End-Verifikation: `/verify-setup` entwirft sie im Interview mit dem User (Beweise, Werkzeuge, Stufen) und baut sie. Erzwungen durch PreToolUse-Hook (Code-Änderung ohne `Verify:`-Zeile oder vereinbartes `DESIGN.md` wird abgelehnt; Verzicht nur als `Verify: none – <Grund>`), die Engine von `/get-it-done` und den Stop-Hook (Prüfschleife). |
| E12 | Skill-Namen sagen, was sie tun. |

## Kern (`core/`, eine Quelle für alle Skills)

- Minimal-Code-Regeln: Ponytail-Regelsatz (Leiter: muss es existieren? → schon im Code? → Standardbibliothek → installierte
  Abhängigkeit → Einzeiler → Minimum; `shortcut:`-Marker; Never-cut-Liste; Aufrufer zuerst greppen).
- Modul-Vokabular: Pocock `codebase-design` (module, interface, depth, seam, adapter, leverage, locality,
  Deletion-Test, „ein Adapter = hypothetische Nahtstelle, zwei = echte“).
- Prinzipien: `core/PRINCIPLES.md`, Index nach pstack-Art (22 Prinzipien, je „wann“ + Regel). Nicht
  dauerhaft geladen; der Hook gibt Haupt-Chat und Subagents den absoluten Pfad, gelesen wird bei
  nicht-trivialer Arbeit. Build the Lever prüft zusätzlich `/code-review`, Encode Lessons in Structure
  setzt `/retro` mit der Tabelle Regel → Erzwinger um.
- Worker-Regeln: pstack `worker.md`, erste Zeile jedes Headless-Prompts.
- Lauf-Log: pstack `show-me-your-work` (TSV, append-only, `log.sh`).
- Schreibregeln für Skills und Doku: Pocock `writing-for-agents` + pstack `unslop`.
- Hooks: SessionStart und SubagentStart speisen den Kern ein (Ponytail-Mechanik; Subagents bekommen nur
  SubagentStart). Stop-Hook für die Prüfschleife (E5).

## Skills (29)

| # | Skill | Was er macht | Hauptquellen |
|---|---|---|---|
| 1 | `/grill` | Interview mit Entscheidungsbaum: pro Runde alle offenen Fragen, nummeriert, je mit Empfehlung; Fakten holt ein Subagent | Pocock grilling |
| 2 | `/grill-docs` | Interview gegen Codebase und Doku, pflegt Glossar und Entscheidungsnotizen (ADR nur bei schwer umkehrbar + überraschend + echter Trade-off) | Pocock grill-with-docs, domain-modeling |
| 3 | `/brainstorm` | Ideen mitdenken, Vorhaben kartieren (Ziel, Nebel, offene Entscheidungen) | Pocock wayfinder, pstack sharpen |
| 4 | `/spec` | Spec mit Einbau-Plan, Schritten, Abhängigkeitsgraph, Prüfbefehl und `auto`/`manuell` pro Schritt | Pocock to-spec, to-tickets, loop-me; pstack multi-phase-plan |
| 5 | `/slop-audit` | Codebase auf Slop analysieren, Ist/Soll als HTML-Grafik, Slop-Regeln recherchiert | Ponytail audit, Pocock HTML-Report, pstack unslop |
| 6 | `/modularize` | Soll-Zustand umsetzen: tiefe Module, Slop entfernen, Verhalten vorher pinnen | Pocock DEEPENING, pstack refactoring |
| 7 | `/architect` | Architektur entwerfen (zwei Formen skizzieren) und verbessern (Hotspots, Kandidaten); pflegt `MODULES.md` | Pocock codebase-design, improve-codebase-architecture, DESIGN-IT-TWICE; pstack architect |
| 8 | `/verify-setup` | Verifikation pro Projekt aufbauen: Tools, Prüf-Skill (Start, Doctor, Bedienen, Beweis, Aufräumen), Feature-Karte; einmal selbst durchlaufen | pstack create-verification-skill |
| 9 | `/verify-maintain` | Verifikation aktuell halten: Doku-Drift, Harness-Lücke, Produkt-Lücke | pstack maintain-verification-skill |
| 10 | `/get-it-done` | **Orchestrator** (siehe unten), normal und `turbo` | Pocock implement-spec; pstack swarm, autonomous-run, autopilot-full |
| 11 | `/tstack` | Hauptskill: versteht das Ziel, wählt den Ablauf, kopiert die Schritte als Todos, führt aus | pstack poteto-mode |
| 12 | `/research` | Recherche mit Primärquellen, Ergebnis als zitierte Datei | Pocock research |
| 13 | `/code-review` | Review auf drei getrennten Achsen (Standards, Spec, Lean) in frischen Chats; nur Befunde mit konkretem Fall | Pocock code-review, Ponytail review, pstack interrogate |
| 14 | `/simplify` | Geänderten Code vereinfachen: Wiederverwendung, Qualität, Effizienz | eingebautes /simplify, Ponytail |
| 15 | `/bugfix` | Erst ein Befehl, der rot wird, dann 3–5 Hypothesen, Fix an der Ursache, Regressionstest | Pocock diagnosing-bugs, pstack bug-fix |
| 16 | `/retro` | Lehren aus der Session in Struktur gießen: Architektur > Typen > Lint > Test > Doku | Pocock retro, pstack reflect, correct |
| 17 | `/tdd` | Rot vor Grün, vertikale Schnitte, Tests nur an vereinbarten Prüfstellen, Mocks nur an Systemgrenzen | Pocock tdd, pstack tdd, test-behavior-not-implementation |
| 19 | `/parallel` | Parallele Arbeit ohne Spec: mehrere Aufgaben in Worktrees, jede mit Prüfschleife | gleiche Maschine wie `/get-it-done turbo` |
| 20 | `/prototype` | Wegwerf-Prototyp beantwortet genau eine Frage, eigener Worktree, wird nie gemergt | Pocock prototype, pstack prototype |
| 21 | `/next` | Nur Beratung: sinnvolle Abfolge der Skills für ein Ziel, mit Begründung | Pocock ask-matt, PHASE-BOUNDARIES; pstack poteto-help |
| 22 | `/leichtbau` | Code minimieren auf Diff oder Pfad; Debt-Liste der `shortcut:`-Marker | Ponytail ponytail, debt |
| 23 | `/workspace` | Workspace einrichten: Ordner, AGENTS.md, context.md | bestehendes /new-project |
| 24 | `/feature-design` | Was soll das Feature genau tun und bringen (nicht Architektur) | neu, Grilling-Mechanik |
| 25 | `/sense-check` | Bewerten, ob das, was gerade gebaut wird, dem Ziel dient | neu, pstack experience-first |
| 26 | `/how-it-works` | Herausfinden, wie fremde Technologie oder Features funktionieren | pstack how, why |
| 27 | `/feature-ideas` | Neue Feature-Ideen brainstormen, gegen `.out-of-scope/` abgeglichen | neu, Pocock wayfinder |
| 28 | `/feature-audit` | Bestehende Features auf Sinn bewerten | neu |
| 29 | `/inventory` | Feature-Inventar und Codebase-Inventar | neu, Ponytail map |
| 30 | `/stand` | Stand von `/get-it-done`- und `/parallel`-Läufen als Graph im Terminal, live mit `--watch` | neu |

## Orchestrierung: `/get-it-done`

```
/get-it-done <spec>          Spec Schritt für Schritt abarbeiten
/get-it-done turbo <spec>    Spec in Bausteine zerlegen, alles Unabhängige parallel
```

Ohne Spec: erst `/grill` und `/spec`.

### Rollen

| Rolle | Aufgabe | Läuft als |
|---|---|---|
| Orchestrator-Chat | Liest Spec, startet die Engine, meldet sich beim User | normale Session, per Remote Control auf dem Handy |
| Worker-Chat | Ein Schritt bzw. Baustein, Prüfschleife bis grün; rote Tore der Engine kommen in dieselbe Session zurück | `claude -p`, eigener Worktree, `--resume` |
| Review-Chat | `/code-review` (Pocock, drei Achsen) über den ganzen Lauf-Diff, ändert nichts | `claude -p` einmal nach dem letzten Merge |
| Fix-Chat | Setzt die belegten Befunde und `/simplify` um, eine Runde | `claude -p` nur ohne `Verdict: ship` |

### Turbo-Ablauf

```
Spec ─► Bausteine + Abhängigkeitsgraph
         ├─ A ─► Worker (Worktree A) ─► Tore grün ─► Merge ─┐
         ├─ B ─► Worker (Worktree B) ─► Tor rot ─► dieselbe Session fixt weiter ─► Merge ─┤
         ├─ C ─► Worker (Worktree C) ─► BLOCKED oder Stillstand ─► Halt, braucht den User
         └─ D (braucht A) ─► startet nach Merge von A
alle gemerged ─► /code-review ─► Fix-Worker (/simplify) ─► Gesamtprüfung (Checks + Verify) ─► Push ─► Push-Nachricht
```

Bausteine entstehen auch innerhalb eines Schritts: Ein nur lesender Planer (`core/planner.md`) zerlegt jeden
offenen Schritt in Teile (`S2.a`, `S2.b`, …) mit eigenem `Berührt`, Prüfbefehl und Kanten, wenn das den
kritischen Pfad verkürzt; ein Vertrags-Teil (Interface, Stub) macht abhängige Stücke parallel. Ein Teil darf eine
Kante seines Schritts weglassen, die er nicht braucht, so läuft auch eine reine Kette S1 → S2 → S3 parallel. Die
Engine prüft den Plan (Teile innerhalb von `Berührt`, keine fremden Kanten, kein Zyklus, Prüfbefehl jetzt rot),
sonst läuft der Schritt ganz. Nach dem Merge aller Teile entscheidet der Prüfbefehl des Schritts (`join`); ist er
rot, beendet ein Worker den Schritt. Kritischer Pfad vorher/nachher steht in Log und `summary.json`.

### Regeln

- Ein fest gescripteter Ablauf trifft die Orchestrierungsentscheidungen, nicht ein Agent.
  Begründung: Pocock implement-spec, „deterministic loop is faster, cheaper, and more reliable“.
- Der Orchestrator glaubt keinem Statustext. Er prüft Seiteneffekte: Diff, Prüfbefehl, Commit-SHA.
- Grenzen: Laufzeit pro Aufruf. Keine Versuchsgrenze: Ein Schritt läuft, bis seine Tore grün sind. Er hält nur,
  wenn er den User braucht (BLOCKED, Kontext voll, eine Runde ohne neuen Commit).
  Keine Diff-Größen-Grenze (wie pstack): ob ein Diff über den Schritt hinausgeht, beurteilt `/code-review` am Ende.
- Ein Ergebnis ohne die geforderten Belege (Commit, grüner Prüfbefehl) gilt nicht; die Engine prüft sie selbst.
- Das Prüfziel wird nie gelockert, um „fertig“ melden zu können.
- Worker spawnen keine weiteren Agents (Rekursionsschutz liegt im Orchestrator-Code).
- Briefs werden als Datei übergeben, nicht per Shell interpoliert.
- Token-Management: jeder Schritt in einem frischen Chat. Läuft der Kontext eines Workers voll, markiert ein
  PreCompact-Hook den Schritt, und die Engine meldet ihn als `split` (aufteilen) statt ihn zu wiederholen.
  Neue Tokens pro Aufruf (Input + Cache-Aufbau + Ausgabe; erneut gelesener Cache zählt nicht) stehen in
  `log.tsv` und `summary.json`, die Kosten aus `total_cost_usd` als `costUsd`. Worker starten ohne MCP-Server
  (`--strict-mcp-config`, gemessen 43,5k → 35,8k Grundkontext). Der Verifikations-Worker läuft nur bei roter
  Abdeckung; der Verifikations-Anteil wird auf die Kosten gemessen und gemeldet, nicht erzwungen. Der Orchestrator hält seinen Stand in der Datei (Häkchen in der Spec
  + Lauf-Log) und setzt einen gestoppten Lauf mit `--resume <id>` auf dem Integrations-Branch fort.
- Aufräumen: Worktrees nach Merge entfernen (`-p`-Läufe räumen nicht selbst auf).
- Vorab-Check: Die Engine liest die Spec aus dem Integrations-Worktree (dieselben Bytes, die der Lauf nutzt)
  und bricht vor dem ersten Worker ab, wenn ein Schritt strukturell nicht laufen kann oder sein Prüfbefehl
  schon grün ist.
- Selbstheilung: Jeder Fehler eines Laufs wird als `[auto …]`-Punkt in `tstack-verbesserungen/verbesserungen.md`
  notiert; der SessionStart-Hook nennt offene Punkte und bietet an, sie an der Ursache zu beheben.

## Einbau jedes Features in die Architektur (Pflicht in `/spec`)

1. `MODULES.md` lesen: welches bestehende Modul nimmt das Feature auf?
2. Reihenfolge: bestehendes Modul vertiefen > neues Modul mit schmalem Interface. Nie ein flacher Helfer.
3. Braucht es Umbau, ist der Umbau der erste Schritt der Spec.
4. Ergebnis in Spec und `MODULES.md`; `/code-review` prüft beides.

## Spec-Abnahme (bevor `/get-it-done` startet)

Der Prüf-Chat nimmt die Spec ab:
- Jeder Schritt ist ohne Rückfrage baubar.
- Jeder Schritt hat einen Prüfbefehl, der vorher rot war.
- Jeder Schritt ist ein vertikaler Schnitt, den man vorführen kann.
- Abhängigkeiten sind vollständig.

## Projektdateien, die der Stack pflegt

| Datei | Zweck | gepflegt von |
|---|---|---|
| `MODULES.md` | Modul-Karte als Mermaid-Diagramm + eine Zeile je Modul (Interface, Prüfstelle); für Mensch und Claude | angelegt von `/architect`, `/inventory` oder `/workspace`, gepflegt von `/architect`, `/spec`, `/modularize`, geprüft von `/code-review` |
| `specs/<name>.md` | Spec mit Schritten und Häkchen | `/spec`, `/get-it-done` |
| `.tstack/runs/<lauf>.tsv` | Lauf-Log | `/get-it-done`, `/parallel`, `/bugfix` |
| `.out-of-scope/` | abgelehnte Ideen mit Begründung | `/feature-ideas`, `/feature-audit`, `/sense-check` |
| Verify-Skill des Projekts | Prüfen der echten App | `/verify-setup`, `/verify-maintain` |

## Handy und Remote Control

Konfiguration, kein Skill: in `/config` „Enable Remote Control for all sessions“ sowie die Push-Optionen
aktivieren. Headless-Läufe (`claude -p`) sind nicht über Remote Control sichtbar, deshalb läuft der
Orchestrator als normale Session und schickt die Pushes.

## Phasen

Jede Phase wird am Pilotprojekt Intel (`Projekte/Ecom Setup/AdIntel`) geprüft, bevor die nächste beginnt. Phase 1 lief noch an `Projekte/fix-anything`.

| Phase | Inhalt | Erfolgskriterium |
|---|---|---|
| 1 | Fundament: `Home/skills`, Plugin-Gerüst, Kern + Hooks, Handy-Setup | In einer Session in `Projekte/fix-anything` sind Tstack-Skills verfügbar; ein Subagent und ein `claude -p` zitieren die Kernregeln; Test-Push kommt an |
| 2 | `/tstack`, `/next`, `/grill`, `/grill-docs`, `/spec`, `/architect` | Ein echtes Feature ergibt eine Spec, die die Spec-Abnahme besteht |
| 3 | `/verify-setup`, `/verify-maintain`, `/tdd`, Stop-Hook | Pilotprojekt hat einen Verify-Skill, der einmal rot und einmal grün gelaufen ist |
| 4 | `/get-it-done` (normal, dann turbo), `/parallel` | Spec aus Phase 2 läuft ohne Eingriff durch; alle Prüfbefehle grün; Worktrees aufgeräumt |
| 5 | `/code-review`, `/simplify`, `/leichtbau`, `/slop-audit`, `/modularize`, `/bugfix`, `/retro` | je ein echter Lauf am Pilotprojekt |
| 6 | `/brainstorm`, `/feature-design`, `/sense-check`, `/feature-ideas`, `/feature-audit`, `/research`, `/how-it-works`, `/prototype`, `/inventory`, `/workspace` | je ein echter Lauf |
| 7 | Stack messen (Benchmark, E7; zuerst prüfen, ob das eingebaute `claude plugin eval` mit Baseline-Arm reicht) | Vergleich ohne / mit Tstack auf festen Aufgaben |

## Offen

