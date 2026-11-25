// /tstack:get-it-done engine: runs the auto steps of a spec in worktrees with fresh headless workers,
// checks each step itself, has a separate reviewer judge it, merges into an integration branch and
// finally fast-forwards the base branch. A program makes every orchestration decision, not an agent.
//
// Usage: node gid.js <spec.md> [--turbo] [-j 4] [--no-push] [--timeout-min 30] [--max-diff 1500] [--resume <run id>]
const fs = require('fs');
const path = require('path');
const { spawn, spawnSync } = require('child_process');

const argv = process.argv.slice(2);
const opt = (name, dflt) => { const i = argv.indexOf(name); return i < 0 ? dflt : argv.splice(i, 2)[1]; };
const has = name => { const i = argv.indexOf(name); if (i >= 0) argv.splice(i, 1); return i >= 0; };
const turbo = has('--turbo');
const noPush = has('--no-push');
const allowNoVerify = has('--allow-no-verify');
const jobs = turbo ? Number(opt('-j', 4)) : 1;
const timeoutMin = Number(opt('--timeout-min', 30));
const maxDiff = Number(opt('--max-diff', 1500));
const resume = opt('--resume', '');
const specArg = argv[0];
if (!specArg) { console.error('usage: node gid.js <spec.md> [--turbo] [-j N] [--no-push]'); process.exit(2); }

const CORE = path.join(__dirname, '..', 'core');
const MAX_ATTEMPTS = 2;

// ---------- shell helpers ----------
const env = { ...process.env, CI: 'true' };
const run = (cmd, args, cwd) => {
  const r = spawnSync(cmd, args, { cwd, env, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  return { code: r.status, out: ((r.stdout || '') + (r.stderr || '')).trim() };
};
const git = (cwd, ...args) => run('git', args, cwd);
const gitOk = (cwd, ...args) => {
  const r = git(cwd, ...args);
  if (r.code !== 0) throw new Error(`git ${args.join(' ')} failed: ${r.out}`);
  return r.out;
};
const bash = (cmd, cwd) => run('bash', ['-c', cmd], cwd);
const checkInteg = cmd => { const r = bash(cmd, integ); git(integ, 'reset', '-q', '--hard'); git(integ, 'clean', '-qfd'); return r; };

const repo = gitOk(path.dirname(path.resolve(specArg)), 'rev-parse', '--show-toplevel');
const specRel = path.relative(repo, path.resolve(specArg)).split(path.sep).join('/');
const runId = resume || new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
const runDir = path.join(repo, '.tstack', 'runs', runId);
const wtRoot = path.join(repo, '.tstack', 'wt', runId);
const integ = path.join(wtRoot, 'integration');
const integBranch = `tstack/${runId}`;

// ---------- log (append-only TSV, as in show-me-your-work) ----------
fs.mkdirSync(runDir, { recursive: true });
fs.writeFileSync(path.join(runDir, "pid"), String(process.pid));
const logFile = path.join(runDir, 'log.tsv');
if (!resume) fs.writeFileSync(logFile, 'ts\tstep\tattempt\tphase\tresult\tevidence\ttokens\n');
const cell = v => String(v ?? '').replace(/[\t\r\n]+/g, ' ').replace(/^([=+\-@])/, "'$1").slice(0, 500);
function log(step, attempt, phase, result, evidence = '', tokens = '') {
  fs.appendFileSync(logFile, [new Date().toISOString(), step, attempt, phase, result, evidence, tokens].map(cell).join('\t') + '\n');
  console.log(`[${step}${attempt ? ' #' + attempt : ''}] ${phase}: ${result}${evidence ? ' – ' + String(evidence).slice(0, 160) : ''}`);
}

// ---------- incidents: every failure goes to the improvement list, to be fixed at the cause later ----------
const homeList = path.join(__dirname, '..', '..', 'tstack-verbesserungen');
const installedList = path.join(require('os').homedir(), '.tstack', 'verbesserungen.md');
const INCIDENTS = process.env.TSTACK_INCIDENTS || (fs.existsSync(homeList) ? path.join(homeList, 'verbesserungen.md') : installedList);
function incident(step, what) {
  log(step, '', 'incident', what);
  if (INCIDENTS === installedList && !fs.existsSync(INCIDENTS)) {
    fs.mkdirSync(path.dirname(INCIDENTS), { recursive: true });
    fs.writeFileSync(INCIDENTS, '# Tstack-Verbesserungen\n\n## Offen\n\n## Erledigt\n');
  }
  if (!fs.existsSync(INCIDENTS)) return;
  const text = fs.readFileSync(INCIDENTS, 'utf8');
  const line = `- [ ] [auto ${new Date().toISOString().slice(0, 10)} ${path.basename(repo)}/${runId} ${step}] ${cell(what).slice(0, 300)}\n`;
  const at = text.indexOf('\n## Erledigt');
  fs.writeFileSync(INCIDENTS, at < 0 ? text + line : text.slice(0, at).trimEnd() + '\n' + line + text.slice(at));
}

// ---------- spec ----------
const { parseSpec, gamedCheckFiles, specProblems } = require('./spec.js');
const readSpec = () => parseSpec(fs.readFileSync(path.join(integ, specRel), 'utf8'));
function markDone(id) {
  const file = path.join(integ, specRel);
  const text = fs.readFileSync(file, 'utf8');
  const start = text.search(new RegExp(`^### ${id}(?=[ \\r\\n])`, 'm'));
  const end = text.indexOf('\n### ', start + 1);
  const sec = text.slice(start, end < 0 ? undefined : end).replace(/^- \[ \]/m, '- [x]');
  fs.writeFileSync(file, text.slice(0, start) + sec + (end < 0 ? '' : text.slice(end)));
  gitOk(integ, 'commit', '-qam', `spec: ${id} erledigt`);
}
const projectVerify = cwd => {
  const agents = path.join(cwd, 'AGENTS.md');
  const line = fs.existsSync(agents) && fs.readFileSync(agents, 'utf8').match(/^Verify:\s*`?([^`\n]+)`?/m);
  return line ? line[1].trim() : '';
};
// `Verify: none – <reason>` is a recorded waiver: it lets the run start but is not a command to run.
const isWaiver = cmd => /^none\b/i.test(cmd);

// ---------- headless claude ----------
const tokensOf = res => Object.values(res.modelUsage || {}).reduce((n, u) =>
  n + u.inputTokens + u.outputTokens + u.cacheReadInputTokens + u.cacheCreationInputTokens, 0);
const tokens = resume ? (({ total, ...t }) => t)(JSON.parse(fs.readFileSync(path.join(runDir, 'summary.json'), 'utf8')).tokens) : {};
const count = (id, res) => { tokens[id] = (tokens[id] || 0) + tokensOf(res); return tokensOf(res); };

const settingsFile = path.join(runDir, 'worker-settings.json');
fs.writeFileSync(settingsFile, JSON.stringify({ hooks: { PreCompact: [{ hooks: [{ type: 'command',
  command: `node "${path.join(__dirname, '..', 'hooks', 'context-full.js').split(path.sep).join('/')}"` }] }] } }));

function claude(prompt, cwd, { readOnly = false, flag = '' } = {}) {
  // relative: the run dir may contain spaces, which the Windows shell would split
  const args = ['-p', '--output-format', 'json', '--permission-mode', 'bypassPermissions',
    '--settings', path.relative(cwd, settingsFile).split(path.sep).join('/'),
    '--disallowedTools', readOnly ? 'Agent,Edit,Write,NotebookEdit' : 'Agent'];
  return new Promise(resolve => {
    // Windows: claude is an npm .cmd shim and needs a shell; no argument contains spaces or quotes.
    const p = spawn('claude', args, { cwd, shell: process.platform === 'win32', env: { ...env, TSTACK_CONTEXT_FLAG: flag } });
    let out = '';
    p.stdout.on('data', d => { out += d; });
    p.stdin.end(prompt);
    const timer = setTimeout(() => {
      log('-', '', 'watchdog', 'timeout, killed', cwd);
      // p.kill() would only end the Windows shell, not the claude process under it.
      if (process.platform === 'win32') run('taskkill', ['/PID', String(p.pid), '/T', '/F']); else p.kill();
    }, timeoutMin * 60000);
    p.on('exit', () => {
      clearTimeout(timer);
      try { resolve(JSON.parse(out)); } catch { resolve({ result: out.slice(-2000), is_error: true }); }
    });
  });
}

// ---------- one step ----------
const goal = spec => (spec.header.match(/^# (.*)$/m) || [])[1] || specRel;

async function runStep(step, spec) {
  let findings = '';
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const name = `${step.id}-a${attempt}`;
    const wt = path.join(wtRoot, name);
    const branch = `${integBranch}-${name}`;
    const base = gitOk(integ, 'rev-parse', 'HEAD');
    gitOk(repo, 'worktree', 'add', '-q', '-b', branch, wt, base);
    const brief = path.join(runDir, `${name}.brief.md`);
    fs.writeFileSync(brief, [
      fs.readFileSync(path.join(CORE, 'worker.md'), 'utf8'),
      `\n# Goal\n${goal(spec)} (spec: ${specRel}, read its header for context; do not edit it)\n`,
      `# Your step\n${step.section}\n`,
      `# Check\nThe step is done when \`${step.check}\` passes in this worktree.\n`,
      findings && `# Findings from the previous attempt (fix these)\n${findings}\n`,
    ].filter(Boolean).join('\n'));
    log(step.id, attempt, 'worker', 'started', wt);
    const flag = path.join(runDir, `${name}.context-full`);
    const res = await claude(`Read the brief at ${brief.split(path.sep).join('/')} and follow it exactly.`, wt, { flag });
    log(step.id, attempt, 'worker', res.is_error ? 'error' : 'finished', (res.result || '').slice(-300), count(step.id, res));
    if (res.is_error) incident(step.id, `worker #${attempt} ended with an error: ${(res.result || '').slice(-200)}`);
    if (fs.existsSync(flag)) {
      cleanup(wt, branch);
      log(step.id, attempt, 'step', 'split: the worker ran out of context, split the step in the spec');
      return 'split';
    }

    const commits = Number(git(wt, 'rev-list', '--count', `${base}..HEAD`).out) || 0;
    const check = step.check ? bash(step.check, wt) : { code: 1, out: 'no check command in spec' };
    const stat = git(wt, 'diff', '--shortstat', `${base}..HEAD`).out;
    const lines = (stat.match(/(\d+) insertion/) || [0, 0])[1] * 1 + (stat.match(/(\d+) deletion/) || [0, 0])[1] * 1;
    log(step.id, attempt, 'check', check.code === 0 ? 'green' : 'red', `${step.check} → ${check.out.slice(-200)}`);
    const problems = [];
    if (!commits) problems.push('- No commit on the step branch: commit your changes.');
    if (check.code !== 0) problems.push(`- Check \`${step.check}\` fails:\n${check.out.slice(-1500)}`);
    if (lines > maxDiff) problems.push(`- Diff is ${lines} lines (limit ${maxDiff}): the step is too large or touches too much.`);
    // Anti-gaming: the check is fixed by the spec. A diff that edits a file the check command names is rejected,
    // unless the step may touch it ("Berührt"); the reviewer judges those edits.
    const changed = git(wt, 'diff', '--name-only', `${base}..HEAD`).out.split('\n').filter(Boolean);
    const checkFiles = gamedCheckFiles(step.check, changed, step.touches);
    if (checkFiles.length) problems.push(`- The diff edits the step's check (${checkFiles.join(', ')}). Never change the check; change the code.`);
    const ruleFiles = changed.filter(f => [specRel, 'AGENTS.md'].includes(f) && !step.touches.includes(f));
    if (ruleFiles.length) problems.push(`- The diff edits ${ruleFiles.join(', ')}, which only the user changes. Revert it.`);

    if (check.code === 0 && problems.length) incident(step.id, `attempt ${attempt} rejected although its check is green: ${problems.join(' ')}`);
    let verdict = 'ISSUES';
    // A worker that reports BLOCKED with a red check, or an env-gap the harness cannot test, needs the user, not another attempt.
    if (/Verdict:\s*BLOCKED/.test(res.result || '') && (check.code !== 0 || /env-gap/.test(res.result))) {
      verdict = 'BLOCKED';
      problems.push((res.result || '').slice(-1500));
    }
    if (!problems.length) {
      const diffFile = path.join(runDir, `${name}.diff`);
      fs.writeFileSync(diffFile, git(wt, 'diff', `${base}..HEAD`).out);
      const review = await claude([
        fs.readFileSync(path.join(CORE, 'reviewer.md'), 'utf8'),
        `\n# Step\n${step.section}\n`,
        `# Diff\nRead ${diffFile.split(path.sep).join('/')} (against the integration branch). The step check \`${step.check}\` passed when the program ran it.`,
      ].join('\n'), wt, { readOnly: true });
      const text = review.result || '';
      verdict = ([...text.matchAll(/VERDICT:[\s*`]*(PASS|ISSUES|BLOCKED)\b/g)].pop() || [])[1];
      if (!verdict) { verdict = 'ISSUES'; incident(step.id, `reviewer gave no VERDICT line: ${text.slice(-200)}`); }
      log(step.id, attempt, 'review', verdict, text.slice(-300), count(step.id, review));
      if (verdict !== 'PASS') problems.push(text.slice(-3000));
    }

    if (verdict === 'PASS') {
      const merge = git(integ, 'merge', '--no-ff', '-q', '-m', `${step.id}: ${step.title}`, branch);
      const after = merge.code === 0 ? checkInteg(step.check) : merge;
      if (merge.code === 0 && after.code === 0) {
        markDone(step.id);
        log(step.id, attempt, 'merge', 'merged', gitOk(integ, 'rev-parse', '--short', 'HEAD'));
        cleanup(wt, branch);
        return 'done';
      }
      if (merge.code === 0) gitOk(integ, 'reset', '-q', '--hard', 'HEAD~1'); else git(integ, 'merge', '--abort');
      problems.push(`- After merging into the integration branch: ${after.out.slice(-1500)}`);
      log(step.id, attempt, 'merge', 'rejected', after.out.slice(-200));
      incident(step.id, `merge into the integration branch rejected: ${after.out.slice(-200)}`);
    }
    cleanup(wt, branch);
    if (verdict === 'BLOCKED') { log(step.id, attempt, 'step', 'blocked', (res.result || '').match(/env-gap.*/)?.[0] || ''); return 'blocked'; }
    findings = problems.join('\n');
  }
  log(step.id, '', 'step', `failed after ${MAX_ATTEMPTS} attempts`);
  incident(step.id, `step failed after ${MAX_ATTEMPTS} attempts: ${findings.slice(-300)}`);
  return 'failed';
}
function cleanup(wt, branch) {
  git(repo, 'worktree', 'remove', '--force', wt);
  fs.rmSync(wt, { recursive: true, force: true, maxRetries: 3 });
  git(repo, 'worktree', 'prune');
  git(repo, 'branch', '-D', branch);
}

// ---------- main loop ----------
(async () => {
  if (git(repo, 'status', '--porcelain', '--untracked-files=no').out) {
    console.error('Working tree has uncommitted changes. Commit or stash them first.'); process.exit(2);
  }
  // Verification gate: no run without the project's end-to-end verification (see /tstack:verify-setup).
  if (!projectVerify(repo) && !allowNoVerify) {
    console.error('No `Verify:` line in AGENTS.md. Run /tstack:verify-setup first (or pass --allow-no-verify if the user waived it).');
    process.exit(2);
  }
  const exclude = path.join(repo, '.git', 'info', 'exclude');
  if (!fs.readFileSync(exclude, 'utf8').includes('.tstack/')) fs.appendFileSync(exclude, '\n.tstack/\n');
  const baseBranch = gitOk(repo, 'rev-parse', '--abbrev-ref', 'HEAD');
  const mode = `${turbo ? 'turbo' : 'sequential'} j=${jobs}`;
  if (resume) {
    if (!fs.existsSync(integ)) { console.error(`No integration worktree for run ${runId}.`); process.exit(2); }
    for (const dir of fs.readdirSync(wtRoot).filter(d => d !== 'integration')) cleanup(path.join(wtRoot, dir), `${integBranch}-${dir}`);
    log('run', '', 'resume', mode, `${specRel} on ${baseBranch}`);
    const sync = git(integ, 'merge', '-q', '--no-edit', baseBranch);
    if (sync.code) { git(integ, 'merge', '--abort'); console.error(`Merging ${baseBranch} into run ${runId} failed:\n${sync.out}`); process.exit(2); }
  } else {
    gitOk(repo, 'worktree', 'add', '-q', '-b', integBranch, integ, 'HEAD');
    log('run', '', 'start', mode, `${specRel} on ${baseBranch}`);
  }
  const before = readSpec();
  const problems = specProblems(before);
  for (const s of before.steps.filter(s => !s.done && s.mode === 'auto' && s.check)) {
    if (checkInteg(s.check).code === 0) problems.push(`${s.id}: the check already passes before the step is built, so it proves nothing: \`${s.check}\``);
  }
  if (problems.length) {
    log('run', '', 'preflight', 'failed', problems.join(' | '));
    if (!resume) cleanup(integ, integBranch);
    fs.writeFileSync(path.join(runDir, 'summary.json'), JSON.stringify({ run: runId, spec: specRel, landed: false, preflight: problems,
      steps: Object.fromEntries(before.steps.map(s => [s.id, s.done ? 'done' : 'waiting'])), tokens: { total: 0 }, log: logFile }, null, 2));
    console.error('Preflight failed, no worker started:\n' + problems.join('\n'));
    process.exit(2);
  }

  const state = {}; // id -> running | done | failed | blocked | split | manual
  const running = new Map();
  for (;;) {
    const spec = readSpec();
    for (const s of spec.steps) if (s.done) state[s.id] = 'done';
    const open = spec.steps.filter(s => !state[s.id]);
    const ready = open.filter(s => s.blockedBy.every(b => state[b] === 'done'));
    for (const s of ready.filter(s => s.mode === 'manual')) { state[s.id] = 'manual'; log(s.id, '', 'step', 'manual: needs the user'); }
    const busy = new Set([...running.keys()].flatMap(id => spec.steps.find(s => s.id === id).touches));
    for (const s of ready.filter(s => s.mode === 'auto')) {
      if (running.size >= jobs) break;
      if (s.touches.some(t => busy.has(t))) continue; // shared file: serialize even if the spec missed the edge
      s.touches.forEach(t => busy.add(t));
      state[s.id] = 'running';
      running.set(s.id, runStep(s, spec).then(r => { state[s.id] = r; running.delete(s.id); }));
    }
    if (!running.size) break;
    await Promise.race(running.values());
  }

  const spec = readSpec();
  const notDone = spec.steps.filter(s => state[s.id] !== 'done');
  let finalCheck = { code: 0, out: '' };
  const verify = projectVerify(integ);
  if (!notDone.length) {
    const sync = git(integ, 'merge', '-q', '--no-edit', baseBranch);
    if (sync.code) { git(integ, 'merge', '--abort'); finalCheck = { code: 1, out: `merging ${baseBranch} into the run failed: ${sync.out}` }; }
    const checks = [...spec.steps.map(s => s.check), isWaiver(verify) ? '' : verify].filter(Boolean);
    for (const c of finalCheck.code ? [] : checks) { finalCheck = checkInteg(c); if (finalCheck.code) { finalCheck.out = `${c}: ${finalCheck.out}`; break; } }
    log('run', '', 'final check', finalCheck.code ? 'red' : 'green', finalCheck.out.slice(-300));
    if (finalCheck.code) incident('run', `final check red although every step passed: ${finalCheck.out.slice(-200)}`);
  }
  let landed = false;
  if (!notDone.length && !finalCheck.code) {
    const ff = git(repo, 'merge', '--ff-only', '-q', integBranch);
    landed = ff.code === 0;
    log('run', '', 'land', landed ? `fast-forwarded ${baseBranch}` : 'fast-forward failed', ff.out);
    if (!landed) incident('run', `fast-forward of ${baseBranch} failed: ${ff.out}`);
    const push = landed && !noPush && git(repo, 'remote').out ? git(repo, 'push', '-q') : null;
    if (push) log('run', '', 'push', push.code ? 'failed' : 'pushed', push.out);
    if (push && push.code) incident('run', `push failed: ${push.out}`);
  }
  if (landed) cleanup(integ, integBranch);

  const summary = { run: runId, spec: specRel, landed, integrationBranch: landed ? null : integBranch,
    steps: Object.fromEntries(spec.steps.map(s => [s.id, state[s.id] || 'waiting'])),
    tokens: { ...tokens, total: Object.values(tokens).reduce((a, b) => a + b, 0) }, log: logFile };
  fs.writeFileSync(path.join(runDir, 'summary.json'), JSON.stringify(summary, null, 2));
  console.log('\nSUMMARY ' + JSON.stringify(summary));
  process.exit(landed ? 0 : 1);
})().catch(e => { log('run', '', 'crash', e.message); incident('run', `engine crashed: ${e.stack || e.message}`); process.exit(3); });
