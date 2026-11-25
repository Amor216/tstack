set -e
bash "$(dirname "$0")/../_lib/todo-app.sh"
python - <<'PY'
p = "todo/store.py"; s = open(p, encoding="utf-8").read()
old = """        tasks = self.load()
        for t in tasks:
            if t.id == task_id:
                t.done = True
        self.save(tasks)"""
new = """        tasks = self.load()
        tasks[task_id].done = True
        self.save(tasks)"""
assert old in s; open(p, "w", encoding="utf-8").write(s.replace(old, new))
PY
git -c user.name=e -c user.email=e@e commit -qam "simplify complete"
git rev-parse HEAD > .e2e-base
