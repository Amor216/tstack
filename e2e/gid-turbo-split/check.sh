export PYTHONDONTWRITEBYTECODE=1; find . -name __pycache__ -prune -exec rm -rf {} + 2>/dev/null
fail=0
log=$(ls -d .tstack/runs/*/ | tail -1)log.tsv
for s in 1 2; do bash checks/s$s.sh >/dev/null 2>&1 && echo "ok   S$s works on base branch" || { echo "FAIL S$s"; fail=1; }; done
python -m unittest discover -s tests -t . >/dev/null 2>&1 && echo "ok   old tests pass" || { echo "FAIL old tests"; fail=1; }
[ "$(grep -c '^- \[x\] erledigt' specs/03-export.md)" = 2 ] && echo "ok   all steps checked" || { echo "FAIL spec not fully checked"; fail=1; }
grep -qP '\tplan\t\tplan\tS2 split: ' "$log" && echo "ok   planner split S2" || { echo "FAIL S2 not split: $(grep -P '\tplan\t' "$log" | cut -f5,6)"; fail=1; }
# at least two S2 parts started before the first S2 part finished: they ran at the same time
first=$(grep -nP '\tS2\.[^\t]+\t\d+\tworker\tfinished' "$log" | head -1 | cut -d: -f1)
started=$(head -n "${first:-0}" "$log" | grep -cP '\tS2\.[^\t]+\t\d+\tworker\tstarted')
[ "${started:-0}" -ge 2 ] && echo "ok   $started S2 parts ran in parallel" || { echo "FAIL only ${started:-0} S2 parts in parallel"; fail=1; }
grep -q '"criticalPath"' "$(dirname "$log")/summary.json" && echo "ok   summary has critical path: $(grep -A3 criticalPath "$(dirname "$log")/summary.json" | tr -d ' \n')" || { echo "FAIL no criticalPath"; fail=1; }
[ "$(git worktree list | wc -l)" = 1 ] && echo "ok   no leftover worktrees" || { echo "FAIL leftover worktrees"; fail=1; }
exit $fail
