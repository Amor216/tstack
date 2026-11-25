set -e
bash "$(dirname "$0")/../_lib/todo-app.sh"
echo "Abdeckung: keine – e2e-Fixture der Engine" >> AGENTS.md
mkdir -p checks specs
cat > checks/s1.sh <<'SH'
# Store.open(): tasks not done, in id order.
PYTHONDONTWRITEBYTECODE=1 python - <<'PY'
import tempfile
from pathlib import Path
from todo.store import Store
with tempfile.TemporaryDirectory() as d:
    s = Store(Path(d) / "t.json")
    s.add("a"); b = s.add("b"); s.add("c"); s.complete(b.id)
    assert [t.title for t in s.open()] == ["a", "c"]
PY
SH
cat > checks/s2.sh <<'SH'
# Three exporters, one module each: export(tasks) -> str.
PYTHONDONTWRITEBYTECODE=1 python - <<'PY'
import json
from datetime import date
from todo.store import Task
from todo.export_csv import export as csv
from todo.export_md import export as md
from todo.export_json import export as js
ts = [Task(1, "a", date(2026, 5, 1)), Task(2, "b", None, True)]
assert csv(ts).splitlines() == ["id,title,due,done", "1,a,2026-05-01,0", "2,b,,1"], csv(ts)
assert md(ts).splitlines() == ["- [ ] a (2026-05-01)", "- [x] b"], md(ts)
assert json.loads(js(ts)) == [{"id": 1, "title": "a", "due": "2026-05-01", "done": False}, {"id": 2, "title": "b", "due": None, "done": True}]
PY
SH
cat > specs/03-export.md <<'MD'
# 03 Offene Aufgaben und Export

Status: abgenommen

## Problem
Aufgaben lassen sich nicht weitergeben, und offene Aufgaben muss man selbst filtern.

## Lösung
`Store.open()` liefert offene Aufgaben; drei Exporter (CSV, Markdown, JSON) machen aus einer Aufgabenliste Text.

## Schritte

### S1 Store kennt offene Aufgaben
- [ ] erledigt
- Blockiert durch: keine
- Modus: auto
- Berührt: `todo/store.py`
- Liefert: `Store.open()` gibt alle nicht erledigten Aufgaben in id-Reihenfolge zurück.
- Prüfbefehl: `bash checks/s1.sh`

### S2 Drei Exporter
- [ ] erledigt
- Blockiert durch: S1
- Modus: auto
- Berührt: `todo/export_csv.py`, `todo/export_md.py`, `todo/export_json.py`
- Liefert: je Modul eine Funktion `export(tasks: list[Task]) -> str`.
  - `export_csv`: Kopfzeile `id,title,due,done`, dann je Aufgabe `id,title,due,done` (due ISO oder leer, done 0/1).
  - `export_md`: je Aufgabe `- [ ] title (due)` bzw. `- [x] title`, Klammer nur mit Datum.
  - `export_json`: JSON-Liste von Objekten mit `id`, `title`, `due` (ISO oder null), `done`.
- Prüfbefehl: `bash checks/s2.sh`
MD
git add -A && git -c user.name=e -c user.email=e@e commit -qm "spec 03"
