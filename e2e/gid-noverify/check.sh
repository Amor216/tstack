fail=0
grep -q "EXIT=2" .e2e-command.log && echo "ok   engine refused (exit 2)" || { echo "FAIL engine did not refuse: $(tail -3 .e2e-command.log)"; fail=1; }
grep -q "verify-setup" .e2e-command.log && echo "ok   points to /tstack:verify-setup" || { echo "FAIL no pointer to verify-setup"; fail=1; }
[ ! -d .tstack/wt ] && echo "ok   no worktree created" || { echo "FAIL worktrees created"; fail=1; }
exit $fail
