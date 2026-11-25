const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

test('size limits count bytes as in the repo, so a CRLF checkout (core.autocrlf) passes like an LF one', () => {
  const copy = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'lint-crlf-')), 'tstack');
  fs.cpSync(path.join(__dirname, '..'), copy, { recursive: true, filter: s => !s.includes(`${path.sep}results`) });
  const toCrlf = dir => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) toCrlf(p);
      else if (p.endsWith('.md')) fs.writeFileSync(p, fs.readFileSync(p, 'utf8').replace(/\r?\n/g, '\r\n'));
    }
  };
  toCrlf(copy);
  const r = spawnSync('node', [path.join(copy, 'scripts', 'lint.js')], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stdout + r.stderr);
});
