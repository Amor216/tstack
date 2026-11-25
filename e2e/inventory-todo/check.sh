fail=0
[ -f INVENTORY.md ] && echo "ok   INVENTORY.md written" || { echo "FAIL no INVENTORY.md"; exit 1; }
for f in add done list; do grep -q "$f" INVENTORY.md || { echo "FAIL feature $f missing"; fail=1; }; done; [ $fail = 0 ] && echo "ok   all three commands listed"
grep -qi "store" INVENTORY.md && grep -qi "cli" INVENTORY.md && echo "ok   both modules listed" || { echo "FAIL modules missing"; fail=1; }
[ -f MODULES.md ] && grep -q "mermaid" MODULES.md && echo "ok   MODULES.md created" || { echo "FAIL no MODULES.md with graph"; fail=1; }
git diff --quiet HEAD -- todo tests && echo "ok   code untouched" || { echo "FAIL code changed"; fail=1; }
exit $fail
