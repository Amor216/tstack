set -e
bash "$(dirname "$0")/../_lib/todo-app.sh"
cat > todo/format.py <<'PY'
class FormatterConfig:
    """Configuration for formatting tasks."""

    def __init__(self, show_done=True, show_due=True, done_marker="x", open_marker=" ", uppercase=False):
        self.show_done = show_done
        self.show_due = show_due
        self.done_marker = done_marker
        self.open_marker = open_marker
        self.uppercase = uppercase


class TaskFormatter:
    """Formats a task as one line."""

    def __init__(self, config=None):
        self.config = config or FormatterConfig()

    def format(self, task):
        marker = self.config.done_marker if task.done else self.config.open_marker
        title = task.title.upper() if self.config.uppercase else task.title
        due = (task.due or "") if self.config.show_due else ""
        return f"[{marker}] {task.id} {title} {due}"


class FormatterFactory:
    """Creates formatters."""

    @staticmethod
    def create(kind="default"):
        if kind == "default":
            return TaskFormatter()
        raise ValueError(f"unknown formatter {kind}")
PY
python - <<'PY'
p = "todo/cli.py"; s = open(p, encoding="utf-8").read()
s = s.replace("from todo.store import Store", "from todo.store import Store\nfrom todo.format import FormatterFactory")
s = s.replace("""        for t in store.load():
            print(f"[{'x' if t.done else ' '}] {t.id} {t.title} {t.due or ''}")""", """        formatter = FormatterFactory.create()
        for t in store.load():
            print(formatter.format(t))""")
open(p, "w", encoding="utf-8").write(s)
PY
git add -A && git -c user.name=e -c user.email=e@e commit -qm "formatter"
cat todo/*.py | wc -l > .before_lines
