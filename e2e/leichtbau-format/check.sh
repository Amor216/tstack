export PYTHONDONTWRITEBYTECODE=1
fail=0
t=$(mktemp -d); r=$(pwd); c="env PYTHONPATH=$r PYTHONIOENCODING=utf-8 python -m todo.cli"
(cd $t && $c add Steuer 2026-12-01 && $c add Milch && $c done 1 && $c list) 2>&1 | tr -d '\015' > /tmp/lb_$$.txt
printf '[x] 1 Steuer 2026-12-01\n[ ] 2 Milch \n' | diff -q - /tmp/lb_$$.txt >/dev/null && echo "ok   list output unchanged" || { echo "FAIL list output: $(cat /tmp/lb_$$.txt)"; fail=1; }
python -m unittest discover -s tests -t . >/dev/null 2>&1 && echo "ok   tests pass" || { echo "FAIL tests"; fail=1; }
before=$(cat .before_lines); now=$(cat todo/*.py | wc -l)
[ $((before - now)) -ge 15 ] && echo "ok   todo/ shrank by $((before - now)) lines" || { echo "FAIL todo/ shrank only $((before - now)) lines"; fail=1; }
grep -rq "FormatterFactory\|FormatterConfig" todo/ && { echo "FAIL factory/config still there"; fail=1; } || echo "ok   factory and config gone"
exit $fail
