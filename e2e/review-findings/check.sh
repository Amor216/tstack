fail=0
git diff --quiet HEAD -- todo/ tests/ && echo "ok   no code changed" || { echo "FAIL review changed code"; fail=1; }
R=.e2e-reply.txt
grep -qiE "done_count|erledigt.*(falsch|immer|gleich|not t\.done)|not t\.done|zählt.*(offen|erledigt)|counts? .*open" $R && echo "ok   found the wrong done count" || { echo "FAIL missed the done-count bug"; fail=1; }
grep -qi "json" $R && echo "ok   flagged --json as not asked for" || { echo "FAIL missed scope creep (--json)"; fail=1; }
exit $fail
