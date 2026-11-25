export PYTHONDONTWRITEBYTECODE=1; find . -name __pycache__ -prune -exec rm -rf {} + 2>/dev/null
# Hidden checks. Exit 0 only if all pass.
fail=0
cat > /tmp/hidden_$$.py <<'PY'
import tempfile, unittest
from pathlib import Path
from todo.store import Store
class Hidden(unittest.TestCase):
    def test_only_one_done(self):
        with tempfile.TemporaryDirectory() as d:
            s = Store(Path(d) / "t.json"); s.add("a"); s.add("b"); s.add("c"); s.complete(1); s.complete(3)
            self.assertEqual([t.done for t in s.load()], [True, False, True])
unittest.main(argv=["x"])
PY
PYTHONPATH=. python /tmp/hidden_$$.py >/dev/null 2>&1 && echo "ok   bug fixed" || { echo "FAIL bug still there"; fail=1; }
python -m unittest discover -s tests -t . >/dev/null 2>&1 && echo "ok   tests pass" || { echo "FAIL tests fail"; fail=1; }
base=$(cat .e2e-base)
new=$( (git diff --name-only $base; git ls-files --others --exclude-standard) | grep '^tests/.*.py$' )
[ -n "$new" ] && echo "ok   test added/changed: $new" || { echo "FAIL no test added"; fail=1; }
cp todo/store.py /tmp/store_$$.py && git show $base:todo/store.py > todo/store.py
python -m unittest discover -s tests -t . >/dev/null 2>&1 && { echo "FAIL new test does not catch the bug"; fail=1; } || echo "ok   new test is red on the buggy code"
cp /tmp/store_$$.py todo/store.py
grep -rn "DEBUG-" --include=*.py . >/dev/null && { echo "FAIL debug instrumentation left"; fail=1; } || echo "ok   no debug leftovers"
exit $fail
