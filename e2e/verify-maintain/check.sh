export PYTHONDONTWRITEBYTECODE=1; find . -name __pycache__ -prune -exec rm -rf {} + 2>/dev/null
fail=0
bash .claude/skills/verify-todo/verify.sh >/tmp/m_$$.log 2>&1 && echo "ok   verify passes" || { echo "FAIL verify still fails: $(tail -3 /tmp/m_$$.log)"; fail=1; }
git diff --quiet HEAD -- todo/ && echo "ok   product code untouched" || { echo "FAIL product code changed"; fail=1; }
grep -rqi 'export' .claude/skills/verify-todo/features/README.md 2>/dev/null && { echo "FAIL map still lists export"; fail=1; } || echo "ok   export removed from map"
cp todo/cli.py /tmp/cli_$$.py; sed -i 's/            print(f"/            pass  # print(f"/' todo/cli.py
bash .claude/skills/verify-todo/verify.sh >/dev/null 2>&1 && { echo "FAIL verify blind to broken list"; fail=1; } || echo "ok   verify still catches a broken list"
cp /tmp/cli_$$.py todo/cli.py
exit $fail
