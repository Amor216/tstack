const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const GID = path.join(__dirname, '..', 'scripts', 'gid.js');
const FAKE = path.join(__dirname, 'fixtures', 'fake-claude.js');

const spec = `# 99 Engine-Test

### S1 Eins
- [ ] erledigt
- Blockiert durch: keine
- Modus: auto
- Berührt:
  - \`S1.txt\`
- Prüfbefehl: \`test -f S1.txt\`

### S2 Zwei
- [ ] erledigt
- Blockiert durch: S1
- Modus: auto
- Berührt: \`S2.txt\`
- Prüfbefehl: \`test -f S2.txt\`
`;

function setup(specText = spec, files = { 'AGENTS.md': 'Verify: `true`\nAbdeckung: keine – Test\n' }) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gid run-'));
  const bin = path.join(dir, 'bin');
  const repo = path.join(dir, 'repo');
  fs.mkdirSync(bin);
  fs.mkdirSync(path.join(repo, 'specs'), { recursive: true });
  fs.writeFileSync(path.join(bin, 'claude.cmd'), `@node "${FAKE}" %*\r\n`);
  fs.writeFileSync(path.join(bin, 'claude'), `#!/bin/sh\nexec node "${FAKE}" "$@"\n`, { mode: 0o755 });
  for (const [f, text] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(repo, f)), { recursive: true });
    fs.writeFileSync(path.join(repo, f), text);
  }
  fs.writeFileSync(path.join(repo, 'specs', '99.md'), specText);
  fs.writeFileSync(path.join(dir, 'list.md'), '# Liste\n\n## Offen\n\n- [ ] alt\n\n## Erledigt\n');
  const sh = c => spawnSync('git', c, { cwd: repo });
  sh(['init', '-q']); sh(['config', 'user.email', 't@t']); sh(['config', 'user.name', 't']); sh(['config', 'core.autocrlf', 'true']);
  sh(['add', '.']); sh(['commit', '-qm', 'init']);
  return { repo, bin, list: path.join(dir, 'list.md') };
}

const FEATURES = '.claude/skills/verify-app/features';
function setupMap(cover = '`src/none.js`') {
  const ctx = setup(spec, { 'AGENTS.md': 'Verify: `true`\n', [`${FEATURES}/README.md`]: 'In sync with: 0000\n',
    [`${FEATURES}/app.md`]: `# App\n\nDeckt ab: ${cover}\nDrive: \`true\`\n` });
  fs.writeFileSync(path.join(ctx.repo, FEATURES, 'README.md'), `In sync with: ${git(ctx.repo, 'rev-parse', 'HEAD')}\n`);
  git(ctx.repo, 'commit', '-qam', 'map');
  return ctx;
}

function gid({ repo, bin, list }, env = {}, ...extra) {
  const r = spawnSync('node', [GID, 'specs/99.md', '--no-push', ...extra], { cwd: repo, encoding: 'utf8',
    env: { ...process.env, CI: '', FAKE_FAIL: '', FAKE_COMPACT: '', FAKE_EDIT: '', FAKE_VERDICT: '', FAKE_NEED: '', FAKE_VERIFY: '', TSTACK_INCIDENTS: list, ...env,
      PATH: bin + path.delimiter + process.env.PATH } });
  const runs = path.join(repo, '.tstack', 'runs');
  const id = fs.readdirSync(runs).sort().pop();
  return { code: r.status, out: r.stdout + r.stderr, id,
    summary: JSON.parse(fs.readFileSync(path.join(runs, id, 'summary.json'), 'utf8')),
    log: fs.readFileSync(path.join(runs, id, 'log.tsv'), 'utf8') };
}

test('a run records tokens per step and in total, and workers run with CI=true', () => {
  const ctx = setup();
  const r = gid(ctx);
  assert.equal(r.code, 0, r.out);
  assert.deepEqual(r.summary.steps, { S1: 'done', S2: 'done' });
  assert.deepEqual(r.summary.tokens, { S1: 150, S2: 150, total: 300, code: 200, verification: 100 });
  assert.doesNotMatch(r.log, /\tverifier\t/);
  assert.equal(r.log.split('\n')[0].split('\t').pop(), 'tokens');
  assert.match(r.log, /\tworker\tfinished\t[^\n]*\t100\n/);
  assert.equal(fs.readFileSync(path.join(ctx.repo, 'S1.txt'), 'utf8'), 'true');
});

test('--resume continues a stopped run on its integration branch without redoing finished steps', () => {
  const ctx = setup();
  const first = gid(ctx, { FAKE_FAIL: 'S2' });
  assert.equal(first.code, 1);
  assert.deepEqual(first.summary.steps, { S1: 'done', S2: 'failed' });
  const second = gid(ctx, {}, '--resume', first.id);
  assert.equal(second.id, first.id);
  assert.equal(second.code, 0, second.out);
  assert.deepEqual(second.summary.steps, { S1: 'done', S2: 'done' });
  const resumed = second.log.slice(second.log.lastIndexOf('\tresume\t'));
  assert.doesNotMatch(resumed, /\tS1\t/);
  assert.ok(fs.existsSync(path.join(ctx.repo, 'S2.txt')));
  const wts = spawnSync('git', ['worktree', 'list'], { cwd: ctx.repo, encoding: 'utf8' }).stdout.trim().split('\n');
  assert.equal(wts.length, 1, wts.join('\n'));
});

test('a worker whose context fills up stops the step for splitting instead of retrying', () => {
  const ctx = setup();
  const r = gid(ctx, { FAKE_COMPACT: 'S1' });
  assert.equal(r.code, 1);
  assert.deepEqual(r.summary.steps, { S1: 'split', S2: 'waiting' });
  assert.equal((r.log.match(/\tS1\t\d+\tworker\tstarted/g) || []).length, 1);
});

test('preflight stops before any worker when a check is already green, a dependency is unknown or Berührt reads empty', () => {
  const bad = spec.replace('test -f S1.txt', 'true').replace('Blockiert durch: S1', 'Blockiert durch: S9')
    .replace('- Berührt: \`S2.txt\`', '- Berührt:');
  const r = gid(setup(bad));
  assert.equal(r.code, 2, r.out);
  assert.doesNotMatch(r.log, /\tworker\t/);
  const problems = r.summary.preflight.join('\n');
  assert.match(problems, /S1: .*already passes/);
  assert.match(problems, /S2: .*S9/);
  assert.match(problems, /S2: .*Berührt/);
});

test('a failed step is recorded as an open incident in the improvement list', () => {
  const ctx = setup();
  const r = gid(ctx, { FAKE_FAIL: 'S1' });
  assert.equal(r.code, 1);
  const list = fs.readFileSync(ctx.list, 'utf8');
  const open = list.slice(list.indexOf('## Offen'), list.indexOf('## Erledigt'));
  assert.match(open, /- \[ \] alt\n- \[ \] \[auto \d{4}-\d\d-\d\d repo\/\d{14} S1\] step failed after 2 attempts: .*fails/);
});

test('an installed plugin copy records incidents in ~/.tstack/verbesserungen.md, creating it', () => {
  const ctx = setup();
  const tmp = path.dirname(ctx.repo);
  const plugin = path.join(tmp, 'cache', 'tstack', 'abc123');
  for (const d of ['scripts', 'core']) fs.cpSync(path.join(__dirname, '..', d), path.join(plugin, d), { recursive: true });
  const scripts = path.join(plugin, 'scripts');
  const home = path.join(tmp, 'home');
  fs.mkdirSync(home);
  spawnSync('node', [path.join(scripts, 'gid.js'), 'specs/99.md', '--no-push'], { cwd: ctx.repo, encoding: 'utf8',
    env: { ...process.env, CI: '', FAKE_FAIL: 'S1', TSTACK_INCIDENTS: '', HOME: home, USERPROFILE: home, PATH: ctx.bin + path.delimiter + process.env.PATH } });
  const list = fs.readFileSync(path.join(home, '.tstack', 'verbesserungen.md'), 'utf8');
  assert.match(list, /## Offen\n[\s\S]*- \[ \] \[auto \d{4}-\d\d-\d\d repo\/\d{14} S1\][\s\S]*## Erledigt/);
});

const git = (repo, ...a) => spawnSync('git', a, { cwd: repo, encoding: 'utf8' }).stdout.trim();

test('checks run in Git bash on Windows even when PATH resolves bash to WSL first', { skip: process.platform !== 'win32' }, () => {
  const ctx = setup();
  const sys = path.join(process.env.SystemRoot || 'C:\\Windows', 'System32');
  const gitCmd = path.join(path.dirname(path.dirname(path.normalize(git(ctx.repo, '--exec-path')))), '..', 'cmd');
  const r = gid(ctx, { PATH: [ctx.bin, path.dirname(process.execPath), sys, gitCmd].join(path.delimiter) });
  assert.equal(r.code, 0, r.out + r.log);
});

test('a step heading without a title is ticked once, not duplicated', () => {
  const ctx = setup(spec.replace('### S1 Eins', '### S1'));
  const r = gid(ctx);
  assert.equal(r.code, 0, r.out);
  const landed = fs.readFileSync(path.join(ctx.repo, 'specs', '99.md'), 'utf8');
  assert.equal(landed.match(/^### S1/gm).length, 1);
  assert.match(landed, /### S1\r?\n- \[x\] erledigt/);
});

test('files a check rewrites in the integration worktree never land', () => {
  const ctx = setup(spec.replace('`test -f S1.txt`', '`test -f S1.txt && echo dirty >> AGENTS.md`'));
  const r = gid(ctx);
  assert.equal(r.code, 0, r.out);
  assert.doesNotMatch(fs.readFileSync(path.join(ctx.repo, 'AGENTS.md'), 'utf8'), /dirty/);
});

test('a reviewer verdict in backticks or bold, followed by a core-rules Verdict line, still counts', () => {
  const ctx = setup();
  const r = gid(ctx, { FAKE_VERDICT: '- fine\n\n**`VERDICT: PASS`**\n\nVerdict: VERIFIED – read the diff' });
  assert.equal(r.code, 0, r.out);
  assert.equal((r.log.match(/\tworker\tstarted/g) || []).length, 2);
});

test('a resumed run lands even after the base branch moved, and keeps the token total', () => {
  const ctx = setup();
  const first = gid(ctx, { FAKE_FAIL: 'S2' });
  fs.writeFileSync(path.join(ctx.repo, 'user.txt'), 'u');
  git(ctx.repo, 'add', 'user.txt'); git(ctx.repo, 'commit', '-qm', 'user');
  const second = gid(ctx, {}, '--resume', first.id);
  assert.equal(second.code, 0, second.out);
  assert.ok(fs.existsSync(path.join(ctx.repo, 'user.txt')) && fs.existsSync(path.join(ctx.repo, 'S2.txt')));
  assert.equal(second.summary.tokens.total, 500);
});

test('a worker that edits the spec or AGENTS.md is rejected', () => {
  const ctx = setup(spec.replace('`test -f S1.txt`', '`test -f S1.txt && ! grep -q weak AGENTS.md`'));
  const r = gid(ctx, { FAKE_EDIT: 'specs/99.md' });
  assert.equal(r.summary.steps.S1, 'failed');
  assert.match(r.log, /specs\/99\.md/);
});

test('a worker that reports an env-gap blocks the step at once, and --resume picks up the harness fixed on the base branch', () => {
  const ctx = setup();
  const first = gid(ctx, { FAKE_NEED: 'harness.txt' });
  assert.equal(first.summary.steps.S1, 'blocked');
  assert.equal((first.log.match(/\tworker\tstarted/g) || []).length, 1);
  assert.doesNotMatch(first.log, /\treview\t/);
  assert.match(first.log, /env-gap: harness\.txt missing/);
  fs.writeFileSync(path.join(ctx.repo, 'harness.txt'), 'h');
  git(ctx.repo, 'add', 'harness.txt'); git(ctx.repo, 'commit', '-qm', 'harness');
  const second = gid(ctx, { FAKE_NEED: 'harness.txt' }, '--resume', first.id);
  assert.equal(second.code, 0, second.out);
  assert.deepEqual(second.summary.steps, { S1: 'done', S2: 'done' });
});

test('a verifier covers the source a step added, its tokens count as verification, and the run lands', () => {
  const ctx = setupMap();
  const r = gid(ctx, { FAKE_VERIFY: 'S*.txt' });
  assert.equal(r.code, 0, r.out + r.log);
  assert.match(r.log, /\tS1\t1\tverifier\tfinished\t/);
  assert.deepEqual(r.summary.tokens, { S1: 350, S2: 350, total: 700, code: 200, verification: 500 });
  assert.equal(r.summary.verificationShare, 0.71);
  assert.match(fs.readFileSync(path.join(ctx.repo, FEATURES, 'app.md'), 'utf8'), /^Deckt ab: `src\/none\.js`, `S\*\.txt`/m);
});

test('a verifier that leaves the new source uncovered fails the step and names the file', () => {
  const r = gid(setupMap(), { FAKE_VERIFY: 'noop' });
  assert.equal(r.summary.steps.S1, 'failed');
  assert.match(r.log, /\tS1\t1\tverifier\trejected\t[^\n]*nicht abgedeckt: S1\.txt/);
});

test('a verifier that edits AGENTS.md fails the step', () => {
  const r = gid(setupMap(), { FAKE_VERIFY: 'agents' });
  assert.equal(r.summary.steps.S1, 'failed');
  assert.match(r.log, /\tverifier\trejected\t[^\n]*AGENTS\.md/);
});

test('the verifier runs while the verification share is below 70 % even with green coverage', () => {
  const r = gid(setupMap('`S*.txt`'));
  assert.equal(r.code, 0, r.out + r.log);
  assert.match(r.log, /\tS1\t1\tverifier\tstarted\t/);
  assert.match(r.log, /\tS2\t1\tverifier\tstarted\t/);
});

test('preflight stops before any worker when there is neither a feature map nor a waiver', () => {
  const r = gid(setup(spec, { 'AGENTS.md': 'Verify: `true`\n' }));
  assert.equal(r.code, 2, r.out);
  assert.doesNotMatch(r.log, /\tworker\t/);
  assert.match(r.summary.preflight.join('\n'), /verify-setup/);
});
