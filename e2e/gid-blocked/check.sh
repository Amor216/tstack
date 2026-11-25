export PYTHONDONTWRITEBYTECODE=1
fail=0
S=$(cat .tstack/runs/*/summary.json 2>/dev/null)
[ -n "$S" ] || { echo "FAIL no summary"; exit 1; }
echo "$S" | grep -q '"landed": false' && echo "ok   did not land" || { echo "FAIL landed although steps are open"; fail=1; }
[ "$(git rev-list --count HEAD)" -le 2 ] && echo "ok   base branch untouched" || { echo "FAIL base branch changed"; fail=1; }
echo "$S" | grep -q '"S1": "done"' && echo "ok   S1 done on integration branch" || { echo "FAIL S1 not done"; fail=1; }
echo "$S" | grep -q '"S2": "manual"' && echo "ok   S2 waits for the user" || { echo "FAIL S2 not marked manual"; fail=1; }
echo "$S" | grep -qE '"S3": "(failed|blocked)"' && echo "ok   S3 stopped (failed/blocked)" || { echo "FAIL S3 not stopped"; fail=1; }
b=$(echo "$S" | sed -n 's/.*"integrationBranch": "\([^"]*\)".*/\1/p')
[ -n "$b" ] && git rev-parse -q --verify "$b" >/dev/null && echo "ok   integration branch kept: $b" || { echo "FAIL integration branch missing"; fail=1; }
git diff HEAD "$b" --name-only 2>/dev/null | grep -q '^checks/' && { echo "FAIL a check file was changed"; fail=1; } || echo "ok   check files unchanged"
exit $fail
