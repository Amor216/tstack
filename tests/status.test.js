const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { load, render } = require('../scripts/status.js');

const spec = done => `# 01 Lauf-Aktivität

### S1 Modul
- [${done ? 'x' : ' '}] erledigt
- Blockiert durch: keine
- Modus: auto
- Prüfbefehl: \`true\`

### S2 Recherche
- [ ] erledigt
- Blockiert durch: S1
- Modus: auto
- Prüfbefehl: \`true\`

### S3 Löschen
- [ ] erledigt
- Blockiert durch: S2
- Modus: auto
- Prüfbefehl: \`true\`
`;

const row = (min, ...cells) => [`2026-11-23T20:${String(min).padStart(2, '0')}:00.000Z`, ...cells].join('\t');
const LOG = ['ts\tstep\tattempt\tphase\tresult\tevidence\ttokens',
  row(0, 'run', '', 'start', 'turbo j=4', 'specs/01.md on main', ''),
  row(1, 'S1', 1, 'worker', 'started', '/r/.tstack/wt/1/S1-a1', ''),
  row(6, 'S1', 1, 'worker', 'finished', 'ok', 200000),
  row(7, 'S1', 1, 'review', 'PASS', 'ok', 30000),
  row(8, 'S1', 1, 'merge', 'merged', '22b4eda', ''),
  row(9, 'S2', 1, 'worker', 'started', '/r/.tstack/wt/1/S2-a1', '')];

function makeRun({ summary, pid = process.pid } = {}) {
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), 'status-'));
  const dir = path.join(repo, '.tstack', 'runs', '20261123200000');
  fs.mkdirSync(dir, { recursive: true });
  fs.mkdirSync(path.join(repo, '.tstack', 'wt', '20261123200000', 'integration', 'specs'), { recursive: true });
  fs.writeFileSync(path.join(repo, '.tstack', 'wt', '20261123200000', 'integration', 'specs', '01.md'), spec(true));
  fs.writeFileSync(path.join(dir, 'log.tsv'), LOG.join('\n') + '\n');
  fs.writeFileSync(path.join(dir, 'pid'), String(pid));
  if (summary) fs.writeFileSync(path.join(dir, 'summary.json'), JSON.stringify(summary));
  return repo;
}

test('a live run shows each step with state, phase, worktree, deps and tokens', () => {
  const [run] = load(makeRun());
  const out = render(run, new Date('2026-11-23T20:12:00Z'));
  assert.match(out, /20261123200000 .*specs\/01\.md.*läuft 12m.*230k Tokens/);
  assert.match(out, /✔ S1 Modul .*fertig.*22b4eda.*230k/);
  assert.match(out, /▶ S2 Recherche .*Worker #1 seit 3m.*S2-a1/);
  assert.match(out, /○ S3 Löschen .*wartet auf S2/);
  assert.ok(out.indexOf('S3') > out.indexOf('S2') && /\n\s+└.*S3/.test(out));
});

test('a stopped run without summary says so and names the resume command', () => {
  const [run] = load(makeRun({ pid: 999999 }));
  const out = render(run, new Date('2026-11-23T20:12:00Z'));
  assert.match(out, /abgebrochen/);
  assert.match(out, /--resume 20261123200000/);
});

test('a finished run shows its summary states and whether it landed', () => {
  const [run] = load(makeRun({ summary: { landed: false, steps: { S1: 'done', S2: 'split', S3: 'waiting' },
    tokens: { S1: 230000, total: 230000 } } }));
  const out = render(run, new Date('2026-11-23T20:12:00Z'));
  assert.match(out, /nicht gelandet/);
  assert.match(out, /✂ S2 Recherche .*aufteilen/);
});
