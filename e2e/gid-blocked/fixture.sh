set -e
bash "$(dirname "$0")/../_lib/todo-app.sh"
mkdir -p checks specs
cat > checks/s1.sh <<'SH'
set -e; t=$(mktemp -d); r=$(pwd); cd $t
c="env PYTHONDONTWRITEBYTECODE=1 PYTHONPATH=$r python -m todo.cli"
$c add a; $c add b
[ "$($c count)" = "2" ]
SH
cat > checks/s3.sh <<'SH'
# Needs a tool that does not exist on this machine: the step cannot pass.
command -v tstack-nonexistent-tool >/dev/null && tstack-nonexistent-tool --check
SH
cat > specs/02-teils.md <<'MD'
# 02 Teilweise automatisch

Status: abgenommen

## Schritte

### S1 Anzahl
- [ ] erledigt
- Blockiert durch: keine
- Modus: auto
- Berührt: todo/cli.py
- Liefert: `python -m todo.cli count` gibt die Zahl aller Aufgaben aus.
- Prüfbefehl: `bash checks/s1.sh`

### S2 Farbschema festlegen
- [ ] erledigt
- Blockiert durch: keine
- Modus: manual
- Berührt: docs/
- Liefert: Entscheidung des Users zum Farbschema.
- Prüfbefehl: `true`

### S3 Export ins Fremdsystem
- [ ] erledigt
- Blockiert durch: keine
- Modus: auto
- Berührt: todo/export.py
- Liefert: Export über das Werkzeug `tstack-nonexistent-tool`.
- Prüfbefehl: `bash checks/s3.sh`
MD
git add -A && git -c user.name=e -c user.email=e@e commit -qm "spec 02"
