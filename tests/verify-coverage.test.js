const { test } = require('node:test');
const assert = require('node:assert');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { coverage, isSource } = require('../scripts/verify-coverage.js');

const CLI = path.join(__dirname, '..', 'scripts', 'verify-coverage.js');
const FEATURES = '.claude/skills/verify-app/features';

function git(dir, ...args) {
  const r = spawnSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', ...args], { cwd: dir, encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  return r.stdout.trim();
}
function write(dir, file, text) {
  fs.mkdirSync(path.dirname(path.join(dir, file)), { recursive: true });
  fs.writeFileSync(path.join(dir, file), text);
}
const commit = dir => { git(dir, 'add', '-A'); git(dir, 'commit', '-qm', 'x'); };

function repo({ cover = '`src/a.js`', drive = 'Drive: `./drive search`\n' } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cov-'));
  git(dir, 'init', '-q');
  write(dir, 'src/a.js', 'a\n');
  write(dir, `${FEATURES}/README.md`, 'In sync with: 0000\n');
  write(dir, `${FEATURES}/search.md`, `# Search\n\nDeckt ab: ${cover}\n${drive}`);
  commit(dir);
  write(dir, `${FEATURES}/README.md`, `In sync with: ${git(dir, 'rev-parse', 'HEAD')}\n`);
  commit(dir);
  return dir;
}
const cli = dir => spawnSync('node', [CLI, dir], { encoding: 'utf8' });

test('isSource', () => {
  for (const p of ['src/a.js', 'app/main.py', 'lib\\x.ts', 'Makefile']) assert.ok(isSource(p), p);
  for (const p of ['README.md', 'tests/a.test.js', 'src/a.test.ts', 'pkg/x_test.go', 'test_x.py', 'src/__tests__/b.js',
    'e2e/run.sh', 'a/fixtures/f.json', 'package-lock.json', 'pnpm-lock.yaml', 'yarn.lock', 'Cargo.lock', '.gitignore',
    '.claude/hooks/x.js', 'specs/01.js', '.tstack/runs/x.json', 'docs/x.js', 'src/b.spec.js']) assert.ok(!isSource(p), p);
});

test('clean repo with map: green', () => {
  const r = coverage(repo());
  assert.deepEqual(r, { ok: true, waived: false, hasMap: true, uncovered: [], undriven: [], problems: [] });
});

test('new source file without glob: exit 1 with path; glob added: exit 0', () => {
  const dir = repo();
  write(dir, 'src/b.js', 'b\n');
  commit(dir);
  let r = cli(dir);
  assert.equal(r.status, 1);
  assert.match(r.stdout, /src\/b\.js/);
  write(dir, `${FEATURES}/search.md`, '# Search\n\nDeckt ab: `src/a.js`, `src/b.js`\nDrive: `./drive search`\n');
  r = cli(dir);
  assert.equal(r.status, 0, r.stdout);
});

test('feature file without Drive: red', () => {
  const r = coverage(repo({ drive: '' }));
  assert.equal(r.ok, false);
  assert.deepEqual(r.undriven, [`${FEATURES}/search.md`]);
});

test('glob ** or **/*: red', () => {
  for (const g of ['**', '**/*']) {
    const r = coverage(repo({ cover: `\`${g}\`` }));
    assert.equal(r.ok, false, g);
    assert.match(r.problems.join('\n'), /ungültig/);
  }
});

test('no feature map: red with hasMap false', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cov-'));
  git(dir, 'init', '-q');
  const r = coverage(dir);
  assert.equal(r.ok, false);
  assert.equal(r.hasMap, false);
  assert.deepEqual(r.problems, ['keine Feature-Map']);
});

test('waiver in AGENTS.md: green and waived', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cov-'));
  write(dir, 'AGENTS.md', '# X\n\nAbdeckung: keine – x\n');
  const r = coverage(dir);
  assert.equal(r.ok, true);
  assert.equal(r.waived, true);
  assert.equal(cli(dir).status, 0);
});

test('missing or unknown In sync with: red', () => {
  const dir = repo();
  write(dir, `${FEATURES}/README.md`, '# Map\n');
  assert.match(coverage(dir).problems.join(), /In sync with fehlt/);
  write(dir, `${FEATURES}/README.md`, 'In sync with: deadbeef\n');
  assert.match(coverage(dir).problems.join(), /unbekannt/);
});

test('docs, tests, lockfiles and deleted files do not count', () => {
  const dir = repo();
  write(dir, 'README.md', 'x\n');
  write(dir, 'tests/a.test.js', 'x\n');
  write(dir, 'package-lock.json', '{}\n');
  fs.rmSync(path.join(dir, 'src/a.js'));
  commit(dir);
  assert.deepEqual(coverage(dir).uncovered, []);
});

test('uncommitted and untracked source files count', () => {
  const dir = repo({ cover: '`src/a.js`' });
  write(dir, 'lib/c.js', 'c\n');
  commit(dir);
  write(dir, `${FEATURES}/README.md`, `In sync with: ${git(dir, 'rev-parse', 'HEAD')}\n`);
  write(dir, 'lib/c.js', 'changed\n');
  write(dir, 'lib/new.js', 'n\n');
  assert.deepEqual(coverage(dir).uncovered, ['lib/c.js', 'lib/new.js']);
});
