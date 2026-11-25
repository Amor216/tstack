set -e
bash "$(dirname "$0")/../_lib/todo-app.sh"
sed -i "/^Verify:/d" AGENTS.md && git -c user.name=e -c user.email=e@e commit -qam "no verification yet"
V=.claude/skills/verify-todo; mkdir -p $V/features
cat > $V/SKILL.md <<'MD'
---
name: verify-todo
description: Drive the todo CLI end to end and prove its features work.
---
Launch: none (short-lived CLI). Each drive runs in a fresh temp dir.
Drive: `bash .claude/skills/verify-todo/verify.sh` runs every feature in features/.
Evidence: transcripts in .verify-evidence/.
Cleanup: the script deletes its temp dir; evidence stays.
MD
cat > $V/features/README.md <<'MD'
# Features
- add.md
- list.md
- export.md
MD
printf '# add\n## Driving it\n`python -m todo.cli add Milch 2026-12-01`\n' > $V/features/add.md
printf '# list\n## Driving it\n`python -m todo.cli list` shows the task.\n' > $V/features/list.md
printf '# export\n## Driving it\n`python -m todo.cli export out.csv` writes a CSV.\n' > $V/features/export.md
cat > $V/verify.sh <<'SH'
set -e
root=$(pwd); ev=$root/.verify-evidence; mkdir -p $ev; t=$(mktemp -d); cd $t
PYTHONPATH=$root python -m todo.cli add Milch 2026-12-01
PYTHONPATH=$root python -m todo.cli list | tee $ev/list.txt | grep -q Milch
PYTHONPATH=$root python -m todo.cli export out.csv && test -f out.csv
cd $root; rm -rf $t
SH
echo 'Verify: `bash .claude/skills/verify-todo/verify.sh`' >> AGENTS.md
git add -A && git -c user.name=e -c user.email=e@e commit -qm "verify skill"
