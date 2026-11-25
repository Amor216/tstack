set -e
bash "$(dirname "$0")/../_lib/todo-app.sh"
echo "Abdeckung: keine – e2e-Fixture der Engine" >> AGENTS.md
mkdir -p checks specs
cat > checks/s1.sh <<'SH'
# Store.due(today): open tasks with due <= today, sorted by due.
PYTHONDONTWRITEBYTECODE=1 python - <<'PY'
import tempfile
from datetime import date
from pathlib import Path
from todo.store import Store
with tempfile.TemporaryDirectory() as d:
    s = Store(Path(d) / "t.json")
    s.add("heute", date(2026, 5, 10)); s.add("spaeter", date(2026, 5, 11)); s.add("ohne")
    s.add("frueher", date(2026, 5, 1)); done = s.add("erledigt", date(2026, 5, 2)); s.complete(done.id)
    got = [t.title for t in s.due(date(2026, 5, 10))]
    assert got == ["frueher", "heute"], got
PY
SH
cat > checks/s2.sh <<'SH'
# `stats` prints open and done counts.
set -e; t=$(mktemp -d); r=$(pwd); cd $t
PYTHONDONTWRITEBYTECODE=1 PYTHONPATH=$r python -m todo.cli add a
PYTHONDONTWRITEBYTECODE=1 PYTHONPATH=$r python -m todo.cli add b
PYTHONDONTWRITEBYTECODE=1 PYTHONPATH=$r python -m todo.cli add c
PYTHONDONTWRITEBYTECODE=1 PYTHONPATH=$r python -m todo.cli done 1
PYTHONDONTWRITEBYTECODE=1 PYTHONPATH=$r python -m todo.cli stats | grep -qx "offen: 2, erledigt: 1"
SH
cat > checks/s3.sh <<'SH'
# `remind` prints due open tasks (due <= today), oldest first, one title per line.
set -e; t=$(mktemp -d); r=$(pwd); cd $t
y=$(python -c "import datetime;print(datetime.date.today()-datetime.timedelta(days=1))")
n=$(python -c "import datetime;print(datetime.date.today()+datetime.timedelta(days=1))")
td=$(python -c "import datetime;print(datetime.date.today())")
c="env PYTHONDONTWRITEBYTECODE=1 PYTHONPATH=$r python -m todo.cli"
$c add morgen $n; $c add heute $td; $c add gestern $y; $c add ohne
out=$($c remind)
[ "$(echo "$out" | grep -c .)" = 2 ] && echo "$out" | head -1 | grep -q gestern && echo "$out" | tail -1 | grep -q heute
SH
cat > specs/01-ausbau.md <<'MD'
# 01 Fälligkeit und Statistik

Status: abgenommen

## Problem
Fällige Aufgaben gehen unter, und es fehlt ein Überblick.

## Lösung
`remind` zeigt fällige offene Aufgaben, `stats` zählt offene und erledigte.

## Einbau
Die Fälligkeitsregel kommt in `Store` (vertieft, eine Methode `due(today)`), die CLI bekommt zwei Befehle.

## Schritte

### S1 Store kennt fällige Aufgaben
- [ ] erledigt
- Blockiert durch: keine
- Modus: auto
- Berührt: todo/store.py
- Liefert: `Store.due(today)` gibt offene Aufgaben mit Fälligkeit bis einschließlich `today` zurück, älteste zuerst; ohne Datum oder erledigt nie.
- Akzeptanz:
  - siehe Prüfbefehl
- Prüfbefehl: `bash checks/s1.sh`

### S2 Statistik in der CLI
- [ ] erledigt
- Blockiert durch: keine
- Modus: auto
- Berührt: todo/cli.py
- Liefert: `python -m todo.cli stats` gibt genau `offen: <n>, erledigt: <m>` aus.
- Akzeptanz:
  - siehe Prüfbefehl
- Prüfbefehl: `bash checks/s2.sh`

### S3 Erinnerung in der CLI
- [ ] erledigt
- Blockiert durch: S1
- Modus: auto
- Berührt: todo/cli.py
- Liefert: `python -m todo.cli remind` gibt die Titel der fälligen offenen Aufgaben aus (heutiges Datum), eine pro Zeile, älteste zuerst, über `Store.due`.
- Akzeptanz:
  - siehe Prüfbefehl
- Prüfbefehl: `bash checks/s3.sh`
MD
git add -A && git -c user.name=e -c user.email=e@e commit -qm "spec 01"
