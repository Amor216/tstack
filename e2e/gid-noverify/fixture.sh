set -e
bash "$(dirname "$0")/../_lib/todo-app.sh"
sed -i "/^Verify:/d" AGENTS.md && git -c user.name=e -c user.email=e@e commit -qam "no verification yet"
mkdir -p specs
printf '# 01 X\n\nStatus: abgenommen\n\n## Schritte\n\n### S1 X\n- [ ] erledigt\n- Blockiert durch: keine\n- Modus: auto\n- Berührt: todo/cli.py\n- Prüfbefehl: `false`\n' > specs/01.md
git add -A && git -c user.name=e -c user.email=e@e commit -qm spec
