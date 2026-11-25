const { test } = require('node:test');
const assert = require('node:assert');
const { parseSpec, gamedCheckFiles, planParts, criticalPath } = require('../scripts/spec.js');

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

const chain = parseSpec(`# 02 Kette

### S1 Basis
- [ ] erledigt
- Blockiert durch: keine
- Modus: auto
- Berührt: \`src/base.js\`
- Prüfbefehl: \`test -f src/base.js\`

### S2 Drei Befehle
- [ ] erledigt
- Blockiert durch: S1
- Modus: auto
- Berührt: \`src/cmd/\`, \`src/index.js\`
- Prüfbefehl: \`npm test\`

### S3 Doku
- [ ] erledigt
- Blockiert durch: S2
- Modus: auto
- Berührt: \`README.md\`
- Prüfbefehl: \`grep -q a README.md\`
`);
const part = (id, extra = {}) => ({ id, title: id, deliver: `baut ${id}`, touches: [`src/cmd/${id}.js`], check: `test -f src/cmd/${id}.js`, blockedBy: [], ...extra });

test('a valid split becomes parts that may drop the step edge, and the reason to keep a step whole is kept', () => {
  const { plan, kept, problems } = planParts(chain, { S1: 'eine Datei', S2: [part('S2.a'), part('S2.b', { blockedBy: ['S1'] })], S3: 'eine Zeile' });
  assert.deepEqual(problems, []);
  assert.deepEqual(kept, { S1: 'eine Datei', S3: 'eine Zeile' });
  assert.deepEqual(plan.S2.map(p => [p.id, p.blockedBy, p.touches, p.part]), [['S2.a', [], ['src/cmd/S2.a.js'], 'S2'], ['S2.b', ['S1'], ['src/cmd/S2.b.js'], 'S2']]);
  assert.match(plan.S2[0].section, /^### S2\.a S2\.a\n[\s\S]*Teil von: S2[\s\S]*#### S2 Drei Befehle/);
});

test('a split that does not hold up is dropped with the reason, and the step runs whole', () => {
  const cases = [
    [[part('S2.a')], /fewer than two/],
    [[part('S2.a'), part('S2.b', { touches: ['src/other.js'] })], /S2\.b: .*src\/other\.js.*Berührt/],
    [[part('S2.a'), part('S2.b', { check: '' })], /S2\.b: .*check/],
    [[part('S2.a'), part('X.b')], /X\.b: .*id/],
    [[part('S2.a'), part('S2.a')], /S2\.a: .*twice/],
    [[part('S2.a', { blockedBy: ['S3'] }), part('S2.b')], /S2\.a: .*S3/],
    [[part('S2.a', { blockedBy: ['S2.b'] }), part('S2.b', { blockedBy: ['S2.a'] })], /cycle/],
  ];
  for (const [parts, why] of cases) {
    const { plan, problems } = planParts(chain, { S2: parts });
    assert.equal(plan.S2, undefined, String(why));
    assert.match(problems.join('\n'), why);
  }
  assert.match(planParts(chain, { S9: [part('S9.a'), part('S9.b')] }).problems.join('\n'), /S9: not an open auto step/);
  assert.match(planParts(chain, {}).problems.join('\n'), /S1: no decision/);
});

test('critical path counts workers on the longest chain; a join whose parts are merged adds none', () => {
  assert.equal(criticalPath(chain.steps), 3);
  const units = parts => [chain.steps[0], ...parts, { ...chain.steps[1], blockedBy: ['S1', ...parts.map(p => p.id)], join: true }, chain.steps[2]];
  assert.equal(criticalPath(units(planParts(chain, { S2: [part('S2.a'), part('S2.b'), part('S2.c')] }).plan.S2)), 2);
  assert.equal(criticalPath(units(planParts(chain, { S2: [part('S2.a'), part('S2.b'), part('S2.c', { blockedBy: ['S2.a'] })] }).plan.S2)), 3);
});
