export PYTHONDONTWRITEBYTECODE=1
fail=0
t=$(mktemp -d); r=$(pwd); c="env PYTHONPATH=$r PYTHONIOENCODING=utf-8 python -m todo.cli"
y=$(python -c "import datetime;print(datetime.date.today()-datetime.timedelta(days=1))")
n=$(python -c "import datetime;print(datetime.date.today()+datetime.timedelta(days=1))")
(cd $t && $c add morgen $n && $c add gestern $y && $c add ohne && $c add alt 2020-01-01 && $c done 4 && $c remind && $c today) 2>&1 | tr -d '\015' > /tmp/md_$$.txt
printf 'gestern\n1 fällig\n' | diff -q - /tmp/md_$$.txt >/dev/null && echo "ok   remind/today output unchanged" || { echo "FAIL output: $(cat /tmp/md_$$.txt | tr '\n' '|')"; fail=1; }
python -m unittest discover -s tests -t . >/dev/null 2>&1 && echo "ok   tests pass" || { echo "FAIL tests"; fail=1; }
[ "$(grep -c '<= today\|<= *today' todo/cli.py)" = 0 ] && grep -q "def due" todo/store.py && echo "ok   due rule lives once, in Store" || { echo "FAIL due rule still in cli or not in Store"; fail=1; }
ls tests/*.py | xargs grep -l "due" >/dev/null 2>&1 && echo "ok   a test covers the due rule" || { echo "FAIL no test covers the due rule"; fail=1; }
exit $fail
