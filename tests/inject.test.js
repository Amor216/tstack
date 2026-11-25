const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const HOOK = path.join(__dirname, '..', 'hooks', 'inject.js');
const context = (event, list) => {
  const r = spawnSync('node', [HOOK, event], { encoding: 'utf8', env: { ...process.env, TSTACK_INCIDENTS: list } });
  return JSON.parse(r.stdout).hookSpecificOutput.additionalContext;
};

test('an installed plugin copy (no Home checkout around it) reads the incident list from ~/.tstack', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'inj-installed-'));
  const plugin = path.join(tmp, 'cache', 'tstack', 'abc123');
  for (const d of ['hooks', 'core']) fs.cpSync(path.join(__dirname, '..', d), path.join(plugin, d), { recursive: true });
  const home = path.join(tmp, 'home');
  fs.mkdirSync(path.join(home, '.tstack'), { recursive: true });
  fs.writeFileSync(path.join(home, '.tstack', 'verbesserungen.md'), '## Offen\n\n- [ ] [auto 2026-11-25 a/1 S1] x\n\n## Erledigt\n');
  const env = { ...process.env, TSTACK_INCIDENTS: '', HOME: home, USERPROFILE: home };
  const r = spawnSync('node', [path.join(plugin, 'hooks', 'inject.js'), 'SessionStart'], { encoding: 'utf8', env });
  assert.match(JSON.parse(r.stdout).hookSpecificOutput.additionalContext, /1 automatisch erfasste Tstack-Vorfälle stehen offen in .*\.tstack/);
});

test('session start names open automatic incidents so the session offers to fix them', () => {
  const list = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'inj-')), 'l.md');
  fs.writeFileSync(list, '## Offen\n\n- [ ] [auto 2026-11-23 a/1 S1] x\n- [ ] [auto 2026-11-23 a/1 S2] y\n- [ ] von Hand\n\n## Erledigt\n\n- [x] [auto 2026-11-22 a/0 S1] z\n');
  assert.match(context('SessionStart', list), /2 automatisch erfasste Tstack-Vorfälle/);
  assert.doesNotMatch(context('SubagentStart', list), /Vorfälle/);
  fs.writeFileSync(list, '## Offen\n\n- [ ] von Hand\n');
  assert.doesNotMatch(context('SessionStart', list), /Vorfälle/);
});
