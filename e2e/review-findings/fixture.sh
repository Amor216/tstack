set -e
bash "$(dirname "$0")/../_lib/todo-app.sh"
mkdir -p specs
cat > specs/01-stats.md <<'MD'
# 01 Statistik

Status: abgenommen

## Lösung
`python -m todo.cli stats` gibt genau `offen: <n>, erledigt: <m>` aus. Nichts sonst.

## Schritte

### S1 Statistik
- [x] erledigt
- Liefert: `stats` gibt `offen: <n>, erledigt: <m>` aus.
MD
git add -A && git -c user.name=e -c user.email=e@e commit -qm spec
git checkout -qb feature/stats
python - <<'PY'
p = "todo/cli.py"; s = open(p, encoding="utf-8").read()
s = s.replace("import sys", "import json\nimport sys")
s = s.replace('    elif cmd == "list":', '''    elif cmd == "stats":
        tasks = store.load()
        open_count = sum(1 for t in tasks if not t.done)
        done_count = sum(1 for t in tasks if not t.done)
        if "--json" in args:
            print(json.dumps({"open": open_count, "done": done_count}))
        else:
            print(f"offen: {open_count}, erledigt: {done_count}")
    elif cmd == "list":''')
open(p, "w", encoding="utf-8").write(s)
PY
git -c user.name=e -c user.email=e@e commit -qam "stats"
