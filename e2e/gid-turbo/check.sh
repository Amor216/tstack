export PYTHONDONTWRITEBYTECODE=1; find . -name __pycache__ -prune -exec rm -rf {} + 2>/dev/null
fail=0
[ -z "$(git status --porcelain --untracked-files=no)" ] && echo "ok   clean tree on base" || { echo "FAIL dirty tree"; fail=1; }
for s in 1 2 3; do bash checks/s$s.sh >/dev/null 2>&1 && echo "ok   S$s works on base branch" || { echo "FAIL S$s"; fail=1; }; done
python -m unittest discover -s tests -t . >/dev/null 2>&1 && echo "ok   old tests pass" || { echo "FAIL old tests"; fail=1; }
[ "$(grep -c '^- \[x\] erledigt' specs/01-ausbau.md)" = 3 ] && echo "ok   all steps checked" || { echo "FAIL spec not fully checked"; fail=1; }
[ "$(git worktree list | wc -l)" = 1 ] && echo "ok   no leftover worktrees" || { echo "FAIL leftover worktrees: $(git worktree list)"; fail=1; }
[ -z "$(git branch --list 'tstack/*')" ] && echo "ok   no leftover branches" || { echo "FAIL leftover branches"; fail=1; }
grep -q "def due" todo/store.py && ! grep -q "def due" todo/cli.py && echo "ok   due logic lives in Store only" || { echo "FAIL due logic not in Store / duplicated"; fail=1; }
exit $fail
