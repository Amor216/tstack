export PYTHONDONTWRITEBYTECODE=1
fail=0
t=$(mktemp -d); r=$(pwd); c="env PYTHONPATH=$r PYTHONIOENCODING=utf-8 python -m todo.cli"
(cd $t && $c add a && $c add b && $c add c && $c done 2 && $c stats) 2>&1 | tr -d '\015' > /tmp/st_$$.txt
[ "$(tail -1 /tmp/st_$$.txt)" = "offen: 2, erledigt: 1" ] && echo "ok   stats output unchanged" || { echo "FAIL stats output: $(tail -1 /tmp/st_$$.txt)"; fail=1; }
python -m unittest discover -s tests -t . >/dev/null 2>&1 && echo "ok   tests pass" || { echo "FAIL tests"; fail=1; }
before=$(cat .before_lines); now=$(wc -l < todo/cli.py)
[ $((before - now)) -ge 8 ] && echo "ok   cli.py shrank by $((before - now)) lines" || { echo "FAIL cli.py shrank only $((before - now)) lines"; fail=1; }
grep -q "# This function\|# check if task\|# We loop\|# print the statistics" todo/cli.py && { echo "FAIL narrating comments left"; fail=1; } || echo "ok   narrating comments gone"
grep -q "include_done\|verbose" todo/cli.py && { echo "FAIL unused parameters left"; fail=1; } || echo "ok   unused parameters gone"
exit $fail
