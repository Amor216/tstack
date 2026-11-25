fail=0
m=$(ls plans/*/MAP.md 2>/dev/null | head -1)
[ -n "$m" ] && echo "ok   map at $m" || { echo "FAIL no plans/*/MAP.md"; exit 1; }
grep -q "## Ziel" "$m" && echo "ok   destination named" || { echo "FAIL no destination"; fail=1; }
[ "$(grep -cE '^- Typ: (research|prototype|grill|task)' "$m")" -ge 3 ] && echo "ok   typed tickets" || { echo "FAIL fewer than 3 typed tickets"; fail=1; }
grep -q "Typ: grill" "$m" && echo "ok   has decisions for the user" || { echo "FAIL no grill ticket"; fail=1; }
git diff --quiet HEAD -- todo tests && echo "ok   no code built" || { echo "FAIL built code"; fail=1; }
exit $fail
