fail=0
b=$(git branch --list 'prototype/*' | tr -d ' *+' | head -1)
[ -n "$b" ] && echo "ok   prototype branch $b" || { echo "FAIL no prototype/* branch"; fail=1; }
[ -n "$b" ] && git ls-tree -r --name-only "$b" | grep -q '\.html$' && echo "ok   html file on the branch" || { echo "FAIL no html on prototype branch"; fail=1; }
[ "$(git rev-list --count master)" = 1 ] && git diff --quiet master -- todo tests && echo "ok   master untouched" || { echo "FAIL master changed"; fail=1; }
[ -n "$b" ] && git show "$b":$(git ls-tree -r --name-only "$b" | grep '\.html$' | head -1) | grep -qi "paus" && echo "ok   models the paused state" || { echo "FAIL paused state not in prototype"; fail=1; }
exit $fail
