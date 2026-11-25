---
runs: 2
max_turns: 40
timeout_seconds: 900
allowed_tools: [Read, Glob, Grep, Skill, Write, Edit, Agent]
---
Schreib die Spec für die Erinnerungsfunktion als `specs/01-erinnerung.md`. Entschieden ist schon alles, keine Rückfragen, die Aufteilung ist vorab freigegeben:
1. `python -m todo.cli remind` zeigt alle offenen Aufgaben, die heute oder früher fällig sind, sortiert nach Fälligkeit.
2. Erledigte Aufgaben und Aufgaben ohne Datum erscheinen nie.
3. Zusätzlich gibt es `python -m todo.cli snooze <id> <tage>`, das die Fälligkeit verschiebt.
4. Kein Hintergrunddienst, keine Benachrichtigungen ans System.
