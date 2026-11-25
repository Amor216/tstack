fail=0
grep -q "❓" .e2e-reply.txt && grep -q "➡️" .e2e-reply.txt && echo "ok   asks a round in grill format" || { echo "FAIL no grill round"; fail=1; }
[ -z "$(git status --porcelain --untracked-files=all | grep -v e2e-reply)" ] && echo "ok   nothing written before confirmation" || { echo "FAIL wrote files: $(git status --porcelain | head -3)"; fail=1; }
grep -qiE "szenario|situation|wer |user|nutzer" .e2e-reply.txt && echo "ok   asks about user and situation" || { echo "FAIL not about who/when"; fail=1; }
exit $fail
