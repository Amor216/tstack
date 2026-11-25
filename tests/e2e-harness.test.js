const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const E2E = path.join(__dirname, '..', 'scripts', 'e2e.js');
const SLOW = path.join(__dirname, 'fixtures', 'fake-claude-slow.js');

test('a chat that hangs past its timeout is killed and its protocol so far is kept', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'e2e-harness-'));
  const bin = path.join(dir, 'bin');
  const scen = path.join(dir, 'scenarios', 'hang');
  fs.mkdirSync(bin);
  fs.mkdirSync(scen, { recursive: true });
  fs.writeFileSync(path.join(bin, 'claude.cmd'), `@node "${SLOW}" %*\r\n`);
  fs.writeFileSync(path.join(bin, 'claude'), `#!/bin/sh\nexec node "${SLOW}" "$@"\n`, { mode: 0o755 });
  fs.writeFileSync(path.join(scen, 'scenario.json'), JSON.stringify({ skill: 'x', timeoutMin: 0.05 }));
  fs.writeFileSync(path.join(scen, 'prompt.md'), 'p');
  fs.writeFileSync(path.join(scen, 'fixture.sh'), 'true\n');
  fs.writeFileSync(path.join(scen, 'check.sh'), 'exit 1\n');

  const t0 = Date.now();
  const r = spawnSync('node', [E2E, 'hang', '--arm', 'with'], { encoding: 'utf8', timeout: 60000,
    env: { ...process.env, TSTACK_E2E_DIR: path.join(dir, 'scenarios'), PATH: bin + path.delimiter + process.env.PATH } });
  assert.ok(Date.now() - t0 < 45000, 'harness waited for the hung chat');
  assert.match(r.stdout, /TIMEOUT after 0\.05 min/);
  const [result] = JSON.parse(fs.readFileSync(path.join(dir, 'scenarios', 'results', fs.readdirSync(path.join(dir, 'scenarios', 'results'))[0]), 'utf8'));
  assert.equal(result.timedOut, true);
  assert.match(fs.readFileSync(result.protocol, 'utf8'), /first-event/);
});
