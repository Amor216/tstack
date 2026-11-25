fail=0
grep -q "❓" .e2e-reply.txt && grep -q "➡️" .e2e-reply.txt && echo "ok   asked a design round" || { echo "FAIL no question round"; fail=1; }
ls .claude/skills/verify-*/SKILL.md >/dev/null 2>&1 && { echo "FAIL generated before the design was confirmed"; fail=1; } || echo "ok   nothing generated yet"
grep -qiE "playwright|screenshot|pty|tmux|skript|script|werkzeug|tool" .e2e-reply.txt && echo "ok   asks about tools" || { echo "FAIL tools not part of the round"; fail=1; }
exit $fail
