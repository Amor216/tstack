const { test } = require('node:test');
const assert = require('node:assert');
const { parseSpec, gamedCheckFiles } = require('../scripts/spec.js');

const spec = `# 01 X

### S1 Modul
- [x] erledigt
- Blockiert durch: keine
- Modus: auto
- Berührt: neu \`src/a.rs\`; \`src/lib.rs\` (nur mod)
- Prüfbefehl: \`cargo test a::\`

### S2 Grep-Prüfung
- [ ] erledigt
- Blockiert durch: S1
- Modus: auto
- Berührt:
  - \`src/research.rs\`
  - \`src/mcp.rs\`: nur status
- Prüfbefehl: \`! grep -n "fn running" src/research.rs && npm test\`

### S3 Verifikation erweitern
- [ ] erledigt
- Blockiert durch: S2
- Modus: manual
- Berührt: \`.claude/skills/verify-x/verify.mjs\`, \`features/README.md\`
- Prüfbefehl: \`node .claude/skills/verify-x/verify.mjs --feature y\`
`;

test('parses steps, edges, mode and check', () => {
  const { steps } = parseSpec(spec);
  assert.deepEqual(steps.map(s => [s.id, s.done, s.blockedBy, s.mode]), [['S1', true, [], 'auto'], ['S2', false, ['S1'], 'auto'], ['S3', false, ['S2'], 'manual']]);
  assert.equal(steps[1].check, '! grep -n "fn running" src/research.rs && npm test');
});

test('Berührt: backticked paths, also from indented continuation lines', () => {
  const { steps } = parseSpec(spec);
  assert.deepEqual(steps[0].touches, ['src/a.rs', 'src/lib.rs']);
  assert.deepEqual(steps[1].touches, ['src/research.rs', 'src/mcp.rs']);
  assert.deepEqual(steps[2].touches, ['.claude/skills/verify-x/verify.mjs', 'features/README.md']);
});

test('a spec with Windows line endings parses the same', () => {
  assert.deepEqual(parseSpec(spec.replace(/\n/g, '\r\n')), parseSpec(spec));
});

test('Berührt without backticks: comma list as before', () => {
  const { steps } = parseSpec('### S1 a\n- Berührt: core, ui; keine\n- Prüfbefehl: `x`\n');
  assert.deepEqual(steps[0].touches, ['core', 'ui']);
});

test('a check file the step may touch is not gaming', () => {
  // a grep check on the file the step must change, and a verify script the step must extend
  assert.deepEqual(gamedCheckFiles('! grep -n "fn running" src/research.rs && npm test', ['src/research.rs'], ['src/research.rs']), []);
  assert.deepEqual(gamedCheckFiles('node .claude/skills/verify-x/verify.mjs --feature y', ['.claude/skills/verify-x/verify.mjs'], ['.claude/skills/verify-x/verify.mjs']), []);
});

test('a folder in Berührt covers the files inside it, but not a sibling with the same prefix', () => {
  const check = 'grep -q x docs/ex/search.md && grep -q y docs/example.md';
  assert.deepEqual(gamedCheckFiles(check, ['docs/ex/search.md', 'docs/example.md'], ['docs/ex/']), ['docs/example.md']);
});

test('a check file outside Berührt is gaming', () => {
  assert.deepEqual(gamedCheckFiles('bash tests/check.sh', ['tests/check.sh', 'src/a.rs'], ['src/a.rs']), ['tests/check.sh']);
  assert.deepEqual(gamedCheckFiles('./tests/check.sh', ['tests/check.sh'], []), ['tests/check.sh']);
});
