export PYTHONDONTWRITEBYTECODE=1; find . -name __pycache__ -prune -exec rm -rf {} + 2>/dev/null
fail=0
ls .claude/skills/verify-*/SKILL.md >/dev/null 2>&1 && grep -q '^name: verify-' .claude/skills/verify-*/SKILL.md && echo "ok   verify skill with frontmatter" || { echo "FAIL no verify skill"; fail=1; }
cmd=$(grep -m1 '^Verify:' AGENTS.md | sed 's/^Verify:[[:space:]]*//; s/`//g')
[ -n "$cmd" ] && echo "ok   AGENTS.md Verify: $cmd" || { echo "FAIL no Verify: line in AGENTS.md"; exit 1; }
bash -c "$cmd" >/tmp/v1_$$.log 2>&1 && echo "ok   verify passes on healthy app" || { echo "FAIL verify fails on healthy app: $(tail -3 /tmp/v1_$$.log)"; fail=1; }
cp todo/cli.py /tmp/cli_$$.py
sed -i 's/            print(f"/            pass  # print(f"/' todo/cli.py
bash -c "$cmd" >/tmp/v2_$$.log 2>&1 && { echo "FAIL verify still passes with broken list"; fail=1; } || echo "ok   verify fails on broken app"
cp /tmp/cli_$$.py todo/cli.py
ls .claude/skills/verify-*/DESIGN.md >/dev/null 2>&1 && echo "ok   design recorded" || { echo "FAIL no DESIGN.md"; fail=1; }
exit $fail
