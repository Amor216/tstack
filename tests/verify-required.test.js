const { test } = require('node:test');
const assert = require('node:assert');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const HOOK = path.join(__dirname, '..', 'hooks', 'verify-required.js');

function repo(files = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vr-'));
  fs.mkdirSync(path.join(dir, '.git'));
  for (const [f, c] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(dir, f)), { recursive: true });
    fs.writeFileSync(path.join(dir, f), c);
  }
  return dir;
}
function run(dir, file, tool = 'Edit') {
  const out = spawnSync('node', [HOOK], { input: JSON.stringify({ tool_name: tool, cwd: dir, tool_input: { file_path: file } }) }).stdout.toString();
  return out ? JSON.parse(out).hookSpecificOutput.permissionDecision : 'allow';
}

test('code edit without verification: deny', () => assert.equal(run(repo(), 'src/a.py'), 'deny'));
test('Write of new code file: deny', () => assert.equal(run(repo(), 'src/new.ts', 'Write'), 'deny'));
test('Verify line present: allow', () => assert.equal(run(repo({ 'AGENTS.md': '# x\nVerify: `npm test`\n' }), 'src/a.py'), 'allow'));
test('explicit waiver: allow', () => assert.equal(run(repo({ 'AGENTS.md': 'Verify: none – throwaway script\n' }), 'a.py'), 'allow'));
test('design agreed, setup in progress: allow', () => assert.equal(run(repo({ '.claude/skills/verify-app/DESIGN.md': 'x' }), 'tests/e2e.py'), 'allow'));
test('verify skill without design: still deny', () => assert.equal(run(repo({ '.claude/skills/verify-app/SKILL.md': 'x' }), 'a.py'), 'deny'));
test('docs, specs, AGENTS.md, .claude: allow', () => {
  const d = repo();
  for (const f of ['README.md', 'docs/x.md', 'specs/01.md', 'AGENTS.md', '.claude/skills/verify-app/verify.sh']) assert.equal(run(d, f), 'allow', f);
});
test('outside any git repo: allow', () => assert.equal(run(fs.mkdtempSync(path.join(os.tmpdir(), 'nogit-')), 'a.py'), 'allow'));
test('non-edit tool: allow', () => assert.equal(run(repo(), 'a.py', 'Read'), 'allow'));
test('broken input fails open', () => {
  const r = spawnSync('node', [HOOK], { input: 'nope' });
  assert.equal(r.status, 0); assert.equal(r.stdout.toString(), '');
});

test('prototype branch: allow', () => {
  const d = repo({ '.git/HEAD': 'ref: refs/heads/prototype/paused\n' });
  fs.rmSync(path.join(d, '.git'), { recursive: true }); fs.mkdirSync(path.join(d, '.git')); fs.writeFileSync(path.join(d, '.git', 'HEAD'), 'ref: refs/heads/prototype/paused\n');
  assert.equal(run(d, 'todo/paused.html'), 'allow');
});
test('prototype worktree (.git file): allow', () => {
  const main = repo(); const gd = path.join(main, '.git', 'worktrees', 'p'); fs.mkdirSync(gd, { recursive: true });
  fs.writeFileSync(path.join(gd, 'HEAD'), 'ref: refs/heads/prototype/x\n');
  const wt = fs.mkdtempSync(path.join(os.tmpdir(), 'wt-')); fs.writeFileSync(path.join(wt, '.git'), `gitdir: ${gd}\n`);
  assert.equal(run(wt, 'a.py'), 'allow');
});
test('normal branch: still deny', () => {
  const d = repo(); fs.writeFileSync(path.join(d, '.git', 'HEAD'), 'ref: refs/heads/main\n');
  assert.equal(run(d, 'a.py'), 'deny');
});
