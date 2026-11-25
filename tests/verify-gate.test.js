const { test } = require('node:test');
const assert = require('node:assert');
const { spawnSync, spawn } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const HOOK = path.join(__dirname, '..', 'hooks', 'verify-gate.js');
const user = text => ({ type: 'user', message: { content: text } });
const tool = (name, input) => ({ type: 'assistant', message: { content: [{ type: 'tool_use', name, input }] } });
const result = () => ({ type: 'user', message: { content: [{ type: 'tool_result', content: 'ok' }] } });
const say = text => ({ type: 'assistant', message: { content: [{ type: 'text', text }] } });

function run(events, extra = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gate-'));
  const file = path.join(dir, 't.jsonl');
  fs.mkdirSync(path.join(dir, '.git')); if (extra.head) fs.writeFileSync(path.join(dir, '.git', 'HEAD'), extra.head); extra = { cwd: dir, ...extra };
  if (extra.verify) { fs.writeFileSync(path.join(dir, 'AGENTS.md'), `Verify: \`${extra.verify}\`
`); extra = { ...extra, cwd: dir }; }
  fs.writeFileSync(file, events.map(e => JSON.stringify(e)).join('\n'));
  const out = spawnSync('node', [HOOK], { input: JSON.stringify({ transcript_path: file, ...extra }) }).stdout.toString();
  return out ? JSON.parse(out) : null;
}

const toolId = (name, input, id) => ({ type: 'assistant', message: { content: [{ type: 'tool_use', id, name, input }] } });
const denied = id => ({ type: 'user', message: { content: [{ type: 'tool_result', tool_use_id: id, is_error: true, content: 'denied' }] } });
test('denied edit does not count: allow', () => assert.equal(run([user('x'), toolId('Write', { file_path: 'a.py' }, 'w1'), denied('w1'), say('could not write')]), null));
test('denied edit then real edit: block', () => assert.equal(run([user('x'), toolId('Write', { file_path: 'a.py' }, 'w1'), denied('w1'), toolId('Edit', { file_path: 'b.py' }, 'e1'), result(), say('done')]).decision, 'block'));
test('no edit: allow', () => assert.equal(run([user('hi'), say('hello')]), null));
test('doc-only edit: allow', () => assert.equal(run([user('x'), tool('Edit', { file_path: 'README.md' }), result(), say('done')]), null));
test('code edit without check: block', () => assert.equal(run([user('x'), tool('Edit', { file_path: 'a.py' }), result(), say('done')]).decision, 'block'));
test('check before edit only: block', () => assert.equal(run([user('x'), tool('Bash', { command: 'pytest' }), result(), tool('Write', { file_path: 'a.ts' }), result(), say('Verdict: VERIFIED – pytest')]).decision, 'block'));
test('check after edit but no verdict: block', () => {
  const r = run([user('x'), tool('Edit', { file_path: 'a.py' }), result(), tool('Bash', { command: 'pytest' }), result(), say('done')]);
  assert.match(r.reason, /no Verdict line/);
});
test('check after edit + verdict: allow', () => assert.equal(run([user('x'), tool('Edit', { file_path: 'a.py' }), result(), tool('PowerShell', { command: 'npm test' }), result(), say('Verdict: NOT VERIFIED – npm test: 2 failing')]), null));
test('edits of an earlier turn do not count: allow', () => assert.equal(run([user('a'), tool('Edit', { file_path: 'a.py' }), result(), say('x'), user('thanks'), say('bye')]), null));
test('stop_hook_active: allow', () => assert.equal(run([user('x'), tool('Edit', { file_path: 'a.py' }), result(), say('done')], { stop_hook_active: true }), null));
test('broken input fails open', () => {
  const r = spawnSync('node', [HOOK], { input: 'not json' });
  assert.equal(r.status, 0); assert.equal(r.stdout.toString(), '');
});
test('stdin never closes: exits within 2s, allows', async () => {
  const p = spawn('node', [HOOK], { stdio: ['pipe', 'pipe', 'pipe'] });
  const t0 = Date.now();
  const code = await new Promise(res => p.on('exit', res));
  assert.equal(code, 0); assert.ok(Date.now() - t0 < 2000);
});

const V = 'python .claude/skills/verify-todo/verify.py all';
test('Verify line: unrelated command after edit: block', () => {
  const r = run([user('x'), tool('Edit', { file_path: 'a.py' }), result(), tool('Bash', { command: 'ls' }), result(), say('Verdict: VERIFIED – ls')], { verify: V });
  assert.match(r.reason, /verify\.py/);
});
test('Verify line: verify command after edit + verdict: allow', () => assert.equal(run([user('x'), tool('Edit', { file_path: 'a.py' }), result(), tool('Bash', { command: 'python .claude\\skills\\verify-todo\\verify.py add' }), result(), say('Verdict: VERIFIED – verify.py')], { verify: V }), null));
test('Verify none waiver: any check counts', () => assert.equal(run([user('x'), tool('Edit', { file_path: 'a.py' }), result(), tool('Bash', { command: 'pytest' }), result(), say('Verdict: VERIFIED – pytest')], { verify: 'none – scratch repo' }), null));
function covRepo({ withMap = true, covered = false } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gate-cov-'));
  const git = (...args) => spawnSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', ...args], { cwd: dir, encoding: 'utf8' }).stdout.trim();
  const write = (f, t) => { fs.mkdirSync(path.dirname(path.join(dir, f)), { recursive: true }); fs.writeFileSync(path.join(dir, f), t); };
  git('init', '-q');
  write('src/a.js', 'a\n');
  if (withMap) write('.claude/skills/verify-app/features/search.md', `Deckt ab: \`src/a.js\`${covered ? ', `src/new.js`' : ''}\nDrive: \`./drive search\`\n`);
  git('add', '-A'); git('commit', '-qm', 'x');
  if (withMap) { write('.claude/skills/verify-app/features/README.md', `In sync with: ${git('rev-parse', 'HEAD')}\n`); git('add', '-A'); git('commit', '-qm', 'y'); }
  write('src/new.js', 'n\n');
  return dir;
}
const verified = [user('x'), tool('Edit', { file_path: 'src/new.js' }), result(), tool('Bash', { command: 'npm test' }), result(), say('Verdict: VERIFIED – npm test')];
test('feature map + red coverage: block naming the file and verify-maintain', () => {
  const r = run(verified, { cwd: covRepo() });
  assert.equal(r.decision, 'block');
  assert.match(r.reason, /src\/new\.js/);
  assert.match(r.reason, /\/tstack:verify-maintain/);
});
test('feature map + green coverage: allow', () => assert.equal(run(verified, { cwd: covRepo({ covered: true }) }), null));
test('no feature map: behaves as before', () => assert.equal(run(verified, { cwd: covRepo({ withMap: false }) }), null));

test('prototype branch: no check required', () => {
  const r = run([user('x'), tool('Edit', { file_path: 'p.html' }), result(), say('done')], { head: 'ref: refs/heads/prototype/p\n' });
  assert.equal(r, null);
});
