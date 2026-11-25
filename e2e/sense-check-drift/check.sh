fail=0
grep -qiE "umbauen|stoppen|stop|reshape" .e2e-reply.txt && echo "ok   verdict is reshape or stop" || { echo "FAIL verdict not reshape/stop: $(head -c 300 .e2e-reply.txt)"; fail=1; }
grep -qiE "remind|erinner" .e2e-reply.txt && grep -qiE "plugin|theme|export" .e2e-reply.txt && echo "ok   names goal and the drift" || { echo "FAIL does not name goal and drift"; fail=1; }
git diff --quiet HEAD && echo "ok   changed nothing" || { echo "FAIL changed code"; fail=1; }
exit $fail
