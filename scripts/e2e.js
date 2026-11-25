// End-to-end harness for Tstack: real headless runs in a throwaway repo, then a hidden check.
// Usage: node scripts/e2e.js [scenario-glob] [--runs N] [--arm with|without|both] [-j N]
// Scenario dir e2e/<name>/: scenario.json {skill, timeoutMin}, prompt.md, fixture.sh, check.sh (exit 0 = pass).
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn, spawnSync } = require('child_process');

const root = path.join(__dirname, '..');
const args = process.argv.slice(2);
const flag = (name, dflt) => { const i = args.indexOf(name); return i < 0 ? dflt : args.splice(i, 2)[1]; };
const runs = Number(flag('--runs', 1));
const armSel = flag('--arm', 'both');
const jobs = Number(flag('-j', 2));
const pattern = new RegExp('^' + (args[0] || '*').replace(/\*/g, '.*') + '$');

const scenDir = process.env.TSTACK_E2E_DIR || path.join(root, 'e2e');
const scenarios = fs.readdirSync(scenDir).filter(n => n !== 'results' && !n.startsWith('_') && pattern.test(n));
const arms = armSel === 'both' ? ['with', 'without'] : [armSel];
const bash = (script, cwd) => spawnSync('bash', [script], { cwd, encoding: 'utf8', timeout: 600000 });

function runOne(name, arm, i) {
  const dir = path.join(scenDir, name);
  const meta = JSON.parse(fs.readFileSync(path.join(dir, 'scenario.json'), 'utf8'));
  const work = fs.mkdtempSync(path.join(os.tmpdir(), `tstack-e2e-${name}-`));
  const fx = bash(path.join(dir, 'fixture.sh'), work);
  if (fx.status !== 0) return Promise.resolve({ name, arm, i, pass: false, detail: 'fixture failed: ' + fx.stderr.slice(-300) });
  if (meta.command && arm === 'with') { // engine scenario: run a command instead of a chat
    const t0 = Date.now();
    const r = spawnSync('bash', ['-c', meta.command.replace('$TSTACK', root.split(path.sep).join('/'))], { cwd: work, encoding: 'utf8', timeout: (meta.timeoutMin || 30) * 60000 });
    fs.writeFileSync(path.join(work, '.e2e-command.log'), (r.stdout || '') + (r.stderr || ''));
    const chk = bash(path.join(dir, 'check.sh'), work);
    return Promise.resolve({ name, arm, i, pass: chk.status === 0, detail: (chk.stdout + chk.stderr).trim().slice(-600),
      reply: ((r.stdout || '').match(/SUMMARY .*/) || [''])[0], min: ((Date.now() - t0) / 60000).toFixed(1), work });
  }
  const task = fs.readFileSync(path.join(dir, 'prompt.md'), 'utf8').trim();
  const prompt = arm === 'with' && meta.skill ? `/tstack:${meta.skill} ${task}` : task;
  const cli = ['-p', '--output-format', 'stream-json', '--verbose', '--setting-sources', 'project,local', '--strict-mcp-config',
    '--permission-mode', 'bypassPermissions'];
  if (arm === 'with') cli.push('--plugin-dir', root);
  const t0 = Date.now();
  return new Promise(resolve => {
    // Windows: claude is an npm .cmd shim, which needs a shell; no argument contains spaces or quotes.
    const p = spawn('claude', cli, { cwd: work, env: { ...process.env, CLAUDE_CODE_DISABLE_AUTO_MEMORY: '1' }, shell: process.platform === 'win32' });
    const protocol = `${work}.stream.jsonl`;
    let out = '';
    let timedOut = false;
    p.stdout.on('data', d => { out += d; fs.appendFileSync(protocol, d); });
    p.stdin.end(prompt);
    const kill = setTimeout(() => {
      timedOut = true;
      // Windows: p.kill() ends only the shell, the claude process under it keeps running.
      if (process.platform === 'win32') spawnSync('taskkill', ['/PID', String(p.pid), '/T', '/F']); else p.kill();
    }, (meta.timeoutMin || 15) * 60000);
    p.on('exit', () => {
      clearTimeout(kill);
      const events = out.split('\n').flatMap(l => { try { return [JSON.parse(l)]; } catch { return []; } });
      const res = events.filter(e => e.type === 'result').pop() || { result: out.slice(-300) };
      fs.writeFileSync(path.join(work, '.e2e-reply.txt'), res.result || '');
      const chk = bash(path.join(dir, 'check.sh'), work);
      const detail = (timedOut ? `TIMEOUT after ${meta.timeoutMin || 15} min, protocol: ${protocol}\n` : '') + (chk.stdout + chk.stderr).trim().slice(-400);
      resolve({ name, arm, i, pass: chk.status === 0 && !timedOut, timedOut, protocol, detail, reply: (res.result || '').slice(-600),
        turns: res.num_turns, min: ((Date.now() - t0) / 60000).toFixed(1), work });
    });
  });
}

(async () => {
  const isCommand = n => !!JSON.parse(fs.readFileSync(path.join(scenDir, n, 'scenario.json'), 'utf8')).command;
  // Engine scenarios run a command, not a chat: a without-arm would compare nothing.
  const queue = scenarios.flatMap(n => (isCommand(n) ? ['with'] : arms).filter(a => arms.includes(a)).flatMap(a => Array.from({ length: runs }, (_, i) => [n, a, i])));
  const results = [];
  await Promise.all(Array.from({ length: jobs }, async () => {
    while (queue.length) {
      const r = await runOne(...queue.shift());
      results.push(r);
      console.log(`${r.pass ? 'PASS' : 'FAIL'} ${r.name} [${r.arm}] #${r.i + 1}  ${r.turns ?? '-'} turns  ${r.min ?? '-'} min\n  ${r.detail.replace(/\n/g, '\n  ')}\n  workspace: ${r.work}`);
    }
  }));
  const outDir = path.join(scenDir, 'results');
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, new Date().toISOString().replace(/[:.]/g, '-') + '.json'), JSON.stringify(results, null, 2));
  for (const n of scenarios) console.log(n, arms.map(a => `${a} ${results.filter(r => r.name === n && r.arm === a && r.pass).length}/${runs}`).join('  '));
})();
