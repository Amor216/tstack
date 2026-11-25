#!/usr/bin/env bash
# Small todo app with tests, used as the starting repo for skill evals.
set -e
mkdir -p todo tests
touch tests/__init__.py
cat > todo/__init__.py <<'PY'
PY
cat > todo/store.py <<'PY'
import json
from dataclasses import dataclass, asdict
from datetime import date
from pathlib import Path


@dataclass
class Task:
    id: int
    title: str
    due: date | None = None
    done: bool = False


class Store:
    """Keeps tasks in a JSON file."""

    def __init__(self, path: Path):
        self.path = path

    def load(self) -> list[Task]:
        if not self.path.exists():
            return []
        raw = json.loads(self.path.read_text())
        return [Task(r["id"], r["title"], date.fromisoformat(r["due"]) if r["due"] else None, r["done"]) for r in raw]

    def save(self, tasks: list[Task]) -> None:
        rows = [{**asdict(t), "due": t.due.isoformat() if t.due else None} for t in tasks]
        self.path.write_text(json.dumps(rows))

    def add(self, title: str, due: date | None = None) -> Task:
        tasks = self.load()
        task = Task(max((t.id for t in tasks), default=0) + 1, title, due)
        self.save(tasks + [task])
        return task

    def complete(self, task_id: int) -> None:
        tasks = self.load()
        for t in tasks:
            if t.id == task_id:
                t.done = True
        self.save(tasks)
PY
cat > todo/cli.py <<'PY'
import sys
from datetime import date
from pathlib import Path
from todo.store import Store


def main(argv: list[str]) -> None:
    store = Store(Path("tasks.json"))
    cmd, *args = argv
    if cmd == "add":
        store.add(args[0], date.fromisoformat(args[1]) if len(args) > 1 else None)
    elif cmd == "done":
        store.complete(int(args[0]))
    elif cmd == "list":
        for t in store.load():
            print(f"[{'x' if t.done else ' '}] {t.id} {t.title} {t.due or ''}")


if __name__ == "__main__":
    main(sys.argv[1:])
PY
cat > tests/test_store.py <<'PY'
import tempfile
import unittest
from datetime import date
from pathlib import Path
from todo.store import Store


class StoreTest(unittest.TestCase):
    def test_add_and_complete(self):
        with tempfile.TemporaryDirectory() as d:
            s = Store(Path(d) / "t.json")
            t = s.add("Steuer", date(2026, 12, 1))
            s.complete(t.id)
            self.assertTrue(s.load()[0].done)


if __name__ == "__main__":
    unittest.main()
PY
cat > AGENTS.md <<'MD'
# todo
CLI todo app. Test: `python -m unittest discover -s tests -t .`
MD
cat > GLOSSARY.md <<'MD'
# Glossar
**Aufgabe**: ein Eintrag mit Titel, optionalem Fälligkeitsdatum und Status erledigt/offen. _Vermeiden_: Ticket, Todo-Item.
MD
echo 'Verify: `python -m unittest discover -s tests -t .`' >> AGENTS.md
git init -q && git add -A && git -c user.name=e -c user.email=e@e commit -qm init
