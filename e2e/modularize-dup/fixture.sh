set -e
bash "$(dirname "$0")/../_lib/todo-app.sh"
python - <<'PY'
p = "todo/cli.py"; s = open(p, encoding="utf-8").read()
s = s.replace('    elif cmd == "list":', '''    elif cmd == "remind":
        today = date.today()
        due = [t for t in store.load() if not t.done and t.due is not None and t.due <= today]
        due.sort(key=lambda t: t.due)
        for t in due:
            print(t.title)
    elif cmd == "today":
        today = date.today()
        tasks = [t for t in store.load() if t.done == False and t.due != None and t.due <= today]
        tasks = sorted(tasks, key=lambda x: x.due)
        print(f"{len(tasks)} fällig")
    elif cmd == "list":''')
open(p, "w", encoding="utf-8").write(s)
PY
git -c user.name=e -c user.email=e@e commit -qam "remind and today"
