set -e
bash "$(dirname "$0")/../_lib/todo-app.sh"
mkdir -p specs
printf '# 01 Erinnerung\n\nStatus: abgenommen\n\n## Problem\nIch vergesse fällige Aufgaben.\n\n## Lösung\n`remind` zeigt fällige offene Aufgaben. Mehr nicht.\n' > specs/01-erinnerung.md
git add -A && git -c user.name=e -c user.email=e@e commit -qm spec
git checkout -qb feature/erinnerung
mkdir -p todo/plugins todo/themes
for i in 1 2 3 4 5; do printf 'class Plugin%s:\n    """Plugin system hook %s."""\n    def run(self, store):\n        raise NotImplementedError\n' $i $i > todo/plugins/p$i.py; done
printf 'THEMES = {"dark": {"fg": "white"}, "light": {"fg": "black"}, "solarized": {}}\n' > todo/themes/__init__.py
printf 'import json\n\ndef export_html(tasks):\n    return "<table>" + "".join(f"<tr><td>{t.title}</td></tr>" for t in tasks) + "</table>"\n' > todo/export.py
git add -A && git -c user.name=e -c user.email=e@e commit -qm "plugin system, themes, html export"
