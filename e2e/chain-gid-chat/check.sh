bash "$(dirname "$0")/../gid-turbo/check.sh"; fail=$?
grep -qiE "gelandet|landed|fast-forward|gepusht|alle .*schritte|S1.*S2.*S3" .e2e-reply.txt && echo "ok   reply reports the landed run" || { echo "FAIL reply does not report the result: $(tail -c 300 .e2e-reply.txt)"; fail=1; }
exit $fail
