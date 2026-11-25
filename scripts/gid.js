// /tstack:get-it-done engine: runs the auto steps of a spec in worktrees with fresh headless workers,
// checks each step itself, merges into an integration branch and
// finally fast-forwards the base branch. A program makes every orchestration decision, not an agent.
//
// Usage: node gid.js <spec.md> [--turbo] [-j 4] [--no-push] [--timeout-min 30] [--resume <run id>]
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
const resume = opt('--resume', '');
const specArg = argv[0];
if (!specArg) { console.error('usage: node gid.js <spec.md> [--turbo] [-j N] [--no-push]'); process.exit(2); }

const CORE = path.join(__dirname, '..', 'core');

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
const { parseSpec, gamedCheckFiles, specProblems, planParts, criticalPath } = require('./spec.js');
const { coverage } = require('./verify-coverage.js');
const gaps = cov => [...cov.problems, ...cov.uncovered.map(f => `nicht abgedeckt: ${f}`), ...cov.undriven.map(f => `ohne Drive: ${f}`)];
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
  n + u.inputTokens + u.outputTokens + u.cacheCreationInputTokens, 0);
const previous = resume ? JSON.parse(fs.readFileSync(path.join(runDir, 'summary.json'), 'utf8')) : {};
const tokens = { ...previous.tokens };
const spent = { code: tokens.code || 0, verification: tokens.verification || 0 };
const cost = { code: previous.costUsd?.code || 0, verification: previous.costUsd?.verification || 0 };
for (const k of ['total', 'code', 'verification']) delete tokens[k];
const count = (id, res, kind) => {
  tokens[id] = (tokens[id] || 0) + tokensOf(res);
  spent[kind] += tokensOf(res);
  cost[kind] += res.total_cost_usd || 0;
  return tokensOf(res);
};
// A resumed `claude -p` session reports usage and cost summed over the whole session; this is the last call's share.
const since = (res, before) => ({ ...res, total_cost_usd: (res.total_cost_usd || 0) - (before.total_cost_usd || 0),
  modelUsage: Object.fromEntries(Object.entries(res.modelUsage || {}).map(([m, u]) => {
    const b = (before.modelUsage || {})[m] || {};
    return [m, Object.fromEntries(['inputTokens', 'outputTokens', 'cacheCreationInputTokens'].map(k => [k, (u[k] || 0) - (b[k] || 0)]))];
  })) });
const usd = n => Math.round(n * 10000) / 10000;
const verificationShare = () => (cost.code + cost.verification ? cost.verification / (cost.code + cost.verification) : 0);

const settingsFile = path.join(runDir, 'worker-settings.json');
fs.writeFileSync(settingsFile, JSON.stringify({ hooks: { PreCompact: [{ hooks: [{ type: 'command',
  command: `node "${path.join(__dirname, '..', 'hooks', 'context-full.js').split(path.sep).join('/')}"` }] }] } }));

const NO_EDITS = 'Edit,Write,NotebookEdit';
const READ_ONLY = `Agent,${NO_EDITS}`;
function claude(prompt, cwd, { deny = 'Agent', flag = '', session = '' } = {}) {
  // relative: the run dir may contain spaces, which the Windows shell would split
  const args = ['-p', '--output-format', 'json', '--strict-mcp-config', '--permission-mode', 'bypassPermissions',
    '--settings', path.relative(cwd, settingsFile).split(path.sep).join('/'),
    '--disallowedTools', deny, ...(session ? ['--resume', session] : [])];
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

// One worker session per step. A red gate goes back into the same session until every gate is green;
// the step stops only when it needs the user: the worker reports BLOCKED, its context is full, or a round
// ends without a new commit and with the same red gates as the round before.
async function runStep(step, spec, findings = '') {
  const wt = path.join(wtRoot, step.id);
  const branch = `${integBranch}-${step.id}`;
  gitOk(repo, 'worktree', 'add', '-q', '-b', branch, wt, gitOk(integ, 'rev-parse', 'HEAD'));
  const brief = path.join(runDir, `${step.id}.brief.md`);
  fs.writeFileSync(brief, [
    fs.readFileSync(path.join(CORE, 'worker.md'), 'utf8'),
    `\n# Goal\n${goal(spec)} (spec: ${specRel}, read its header for context; do not edit it)\n`,
    `# Your step\n${step.section}\n`,
    `# Check\nThe step is done when \`${step.check}\` passes in this worktree.\n`,
    findings && `# Findings (fix these)\n${findings}\n`,
  ].filter(Boolean).join('\n'));
  const flag = path.join(runDir, `${step.id}.context-full`);
  const read = `Read the brief at ${brief.split(path.sep).join('/')} and follow it exactly.`;
  const stop = (round, state, why) => { cleanup(wt, branch); log(step.id, round, 'step', state, why); return state; };
  let session = '', before = null, red = '', head = '';
  for (let round = 1; ; round++) {
    log(step.id, round, 'worker', 'started', wt);
    const res = await claude(red ? `${read}\nThe step is not done yet. Fix this, commit, and end with your Verdict line:\n${red}` : read, wt, { flag, session });
    const own = before && res.session_id === session ? since(res, before) : res;
    if (res.session_id) { session = res.session_id; before = res; }
    log(step.id, round, 'worker', res.is_error ? 'error' : 'finished', (res.result || '').slice(-300), count(step.id, own, 'code'));
    if (res.is_error) incident(step.id, `worker round ${round} ended with an error: ${(res.result || '').slice(-200)}`);
    if (fs.existsSync(flag)) return stop(round, 'split', 'the worker ran out of context, split the step in the spec');
    const blocked = (res.result || '').match(/Verdict:\s*BLOCKED\s*[–-]\s*(\S.*)/);
    if (blocked) return stop(round, 'blocked', blocked[1]);

    const problems = await gates(step, spec, round, wt, branch);
    if (!problems.length) { cleanup(wt, branch); return 'done'; }
    const now = gitOk(wt, 'rev-parse', 'HEAD');
    red = problems.join('\n');
    if (now === head) {
      const why = 'stuck: no new commit since the round before';
      incident(step.id, `step ${why}: ${red.slice(-300)}`);
      return stop(round, 'blocked', `${why}: ${red.slice(-300)}`);
    }
    head = now;
  }
}

// The objective gates of a step: commit, check, untouched rules, coverage (a verifier closes gaps), check after
// the merge. Returns the red ones; none means the step is merged.
async function gates(step, spec, round, wt, branch) {
  const base = gitOk(wt, 'merge-base', 'HEAD', integBranch);
  const { check, problems } = inspect(step, round, wt, base);
  if (check.code === 0 && problems.length) incident(step.id, `round ${round} rejected although its check is green: ${problems.join(' ')}`);
  if (problems.length) return problems;

  const cov = coverage(wt);
  if (!cov.waived && !cov.ok) {
    const vbrief = path.join(runDir, `${step.id}-r${round}.verifier.md`);
    fs.writeFileSync(vbrief, [
      fs.readFileSync(path.join(CORE, 'verifier.md'), 'utf8'),
      `\n# Goal\n${goal(spec)} (spec: ${specRel})\n`,
      `# Your step\n${step.section}\n`,
      `# Coverage\nRun \`node "${path.join(__dirname, 'verify-coverage.js').split(path.sep).join('/')}" .\` in this worktree. Gaps now:\n${gaps(cov).join('\n') || 'none'}\n`,
    ].join('\n'));
    log(step.id, round, 'verifier', 'started', wt);
    const vres = await claude(`Read the brief at ${vbrief.split(path.sep).join('/')} and follow it exactly.`, wt);
    log(step.id, round, 'verifier', vres.is_error ? 'error' : 'finished', (vres.result || '').slice(-300), count(step.id, vres, 'verification'));
    if (vres.is_error) incident(step.id, `verifier round ${round} ended with an error: ${(vres.result || '').slice(-200)}`);
    const again = inspect(step, round, wt, base).problems;
    const after = coverage(wt);
    if (!after.ok) again.push(`- Verification coverage is red after the verifier:\n${gaps(after).join('\n')}`);
    if (again.length) { log(step.id, round, 'verifier', 'rejected', again.join(' ')); return again; }
  }

  const merge = git(integ, 'merge', '--no-ff', '-q', '-m', `${step.id}: ${step.title}`, branch);
  const after = merge.code === 0 ? checkInteg(step.check) : merge;
  if (merge.code === 0 && after.code === 0) {
    if (!step.part) markDone(step.id);
    log(step.id, round, 'merge', 'merged', gitOk(integ, 'rev-parse', '--short', 'HEAD'));
    return [];
  }
  if (merge.code === 0) gitOk(integ, 'reset', '-q', '--hard', 'HEAD~1'); else git(integ, 'merge', '--abort');
  log(step.id, round, 'merge', 'rejected', after.out.slice(-200));
  incident(step.id, `merge into the integration branch rejected: ${after.out.slice(-200)}`);
  return [`- After merging into the integration branch \`${integBranch}\` (merge it into your branch and resolve): ${after.out.slice(-1500)}`];
}
// Turbo: all parts of a split step are merged. The step's own check decides; red → one worker finishes the step.
async function joinStep(step, spec) {
  const r = checkInteg(step.check);
  log(step.id, '', 'join', r.code ? 'red' : 'green', `${step.check} → ${r.out.slice(-200)}`);
  if (r.code) return runStep(step, spec, `- All parts of ${step.id} are merged, but the step check still fails. Finish the step:\n${r.out.slice(-1500)}`);
  markDone(step.id);
  log(step.id, '', 'merge', 'merged', gitOk(integ, 'rev-parse', '--short', 'HEAD'));
  return 'done';
}

// Once all steps are merged: one /tstack:code-review over the run's diff, then one worker applies its cited
// findings with /tstack:simplify. Returns the fix's red rule gates; the final check then decides whether the run lands.
const REVIEW_SKILL = path.join(__dirname, '..', 'skills/code-review');
const SIMPLIFY_SKILL = path.join(__dirname, '..', 'skills/simplify');
const slash = p => p.split(path.sep).join('/');
async function reviewRun(spec, from) {
  const res = await claude([
    fs.readFileSync(path.join(REVIEW_SKILL, 'SKILL.md'), 'utf8'),
    `\n# This run\nYou run headless at the end of a /tstack:get-it-done run; nobody answers questions and you edit no file. Fixed point: ${from}. Spec: ${specRel}. The files the skill links are in ${slash(REVIEW_SKILL)}.`,
  ].join('\n'), integ, { deny: NO_EDITS });
  const text = res.result || '';
  const file = path.join(runDir, 'review.md');
  fs.writeFileSync(file, text);
  const ship = /Verdict:\s*ship\b/i.test(text);
  log('run', '', 'review', res.is_error ? 'error' : ship ? 'ship' : 'fix', `full review: ${slash(file)}`, count('review', res, 'verification'));
  if (res.is_error) incident('run', `review ended with an error: ${text.slice(-200)}`);
  if (res.is_error || ship) return [];

  const brief = path.join(runDir, 'review.brief.md');
  fs.writeFileSync(brief, [
    fs.readFileSync(path.join(CORE, 'worker.md'), 'utf8'),
    `\n# Goal\n${goal(spec)} (spec: ${specRel}, read its header for context; do not edit it)\n`,
    `# Your step\n### review Fix the review findings\nApply every finding below that cites a concrete case, then clean up the run's diff (\`git diff ${from}..HEAD\`) as the simplify skill says. The files the skill links are in ${slash(SIMPLIFY_SKILL)}.\n`,
    `# Review\n${text}\n`,
    `# Simplify\n${fs.readFileSync(path.join(SIMPLIFY_SKILL, 'SKILL.md'), 'utf8')}`,
  ].join('\n'));
  const before = gitOk(integ, 'rev-parse', 'HEAD');
  log('review', 1, 'worker', 'started', integ);
  const fix = await claude(`Read the brief at ${slash(brief)} and follow it exactly.`, integ);
  const result = path.join(runDir, 'fix.result.md');
  fs.writeFileSync(result, fix.result || '');
  log('review', 1, 'worker', fix.is_error ? 'error' : 'finished', `result: ${slash(result)}`, count('review', fix, 'code'));
  if (fix.is_error) incident('run', `review fix worker ended with an error: ${(fix.result || '').slice(-200)}`);
  git(integ, 'reset', '-q', '--hard');
  git(integ, 'clean', '-qfd');
  const changed = git(integ, 'diff', '--name-only', `${before}..HEAD`).out.split('\n').filter(Boolean);
  const gamed = [...new Set(spec.steps.flatMap(s => gamedCheckFiles(s.check, changed, s.touches)))];
  const rules = changed.filter(f => [specRel, 'AGENTS.md'].includes(f));
  return [...gamed.map(f => `the review fix edits the check file ${f}`), ...rules.map(f => `the review fix edits ${f}, which only the user changes`)];
}

// Turbo: a read-only planner splits steps into parts; the engine keeps only splits that hold up.
// The raw plan is kept in the run dir, so --resume runs the same parts.
async function planRun(spec) {
  const file = path.join(runDir, 'plan.json');
  const open = spec.steps.filter(s => !s.done && s.mode === 'auto');
  let raw = {};
  if (fs.existsSync(file)) raw = JSON.parse(fs.readFileSync(file, 'utf8'));
  else if (open.length) {
    const res = await claude([fs.readFileSync(path.join(CORE, 'planner.md'), 'utf8'),
      `\n# Spec\n${specRel}. Open auto steps: ${open.map(s => s.id).join(', ')}.`].join('\n'), integ, { deny: READ_ONLY });
    const json = [...(res.result || '').matchAll(/```json\s*([\s\S]*?)```/g)].pop();
    try { raw = JSON.parse(json[1]); } catch { incident('plan', `planner gave no readable plan: ${(res.result || '').slice(-200)}`); }
    log('plan', '', 'planner', res.is_error ? 'error' : 'finished', (res.result || '').slice(-300), count('plan', res, 'code'));
    fs.writeFileSync(file, JSON.stringify(raw, null, 2));
  }
  const { plan, kept, problems } = planParts(spec, raw);
  for (const [id, parts] of Object.entries(plan)) {
    const green = parts.filter(p => !resume && checkInteg(p.check).code === 0);
    if (green.length) { delete plan[id]; problems.push(...green.map(p => `${p.id}: the check already passes, so it proves nothing: \`${p.check}\``)); }
  }
  for (const [id, why] of Object.entries(kept)) log('plan', '', 'plan', `${id} whole: ${why.replace(/^whole:\s*/i, '')}`);
  for (const [id, parts] of Object.entries(plan)) log('plan', '', 'plan', `${id} split: ${parts.map(p => `${p.id}${p.blockedBy.length ? ` (after ${p.blockedBy.join(', ')})` : ''}`).join(', ')}`);
  if (problems.length) log('plan', '', 'plan', 'runs whole', problems.join(' | '));
  return plan;
}
const unitsOf = (spec, plan) => spec.steps.flatMap(s => s.done || !plan[s.id] ? [s]
  : [...plan[s.id], { ...s, blockedBy: [...s.blockedBy, ...plan[s.id].map(p => p.id)], join: true }]);

function inspect(step, attempt, wt, base) {
  const commits = Number(git(wt, 'rev-list', '--count', `${base}..HEAD`).out) || 0;
  const check = step.check ? bash(step.check, wt) : { code: 1, out: 'no check command in spec' };
  log(step.id, attempt, 'check', check.code === 0 ? 'green' : 'red', `${step.check} → ${check.out.slice(-200)}`);
  const problems = [];
  if (!commits) problems.push('- No commit on the step branch: commit your changes.');
  if (check.code !== 0) problems.push(`- Check \`${step.check}\` fails:\n${check.out.slice(-1500)}`);
  // Anti-gaming: the check is fixed by the spec. A diff that edits a file the check command names is rejected,
  // unless the step may touch it ("Berührt"); the review at the end of the run judges those edits.
  const changed = git(wt, 'diff', '--name-only', `${base}..HEAD`).out.split('\n').filter(Boolean);
  const checkFiles = gamedCheckFiles(step.check, changed, step.touches);
  if (checkFiles.length) problems.push(`- The diff edits the step's check (${checkFiles.join(', ')}). Never change the check; change the code.`);
  const ruleFiles = changed.filter(f => [specRel, 'AGENTS.md'].includes(f) && !step.touches.includes(f));
  if (ruleFiles.length) problems.push(`- The diff edits ${ruleFiles.join(', ')}, which only the user changes. Revert it.`);
  return { check, problems };
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
  const cov = coverage(integ);
  if (!cov.hasMap && !cov.waived) problems.push('No feature map of the verification: run /tstack:verify-setup or add `Abdeckung: keine – <reason>` to AGENTS.md');
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

  const state = {}; // unit id (step or part) -> running | done | blocked | split | manual
  const plan = turbo ? await planRun(before) : {};
  const parts = Object.values(plan).flat();
  const merged = fs.readFileSync(logFile, 'utf8');
  for (const p of parts) if (new RegExp(`\\t${p.id.replace(/\./g, '\\.')}\\t\\d+\\tmerge\\tmerged\\t`).test(merged)) state[p.id] = 'done';
  const critical = { before: criticalPath(before.steps.filter(s => !s.done)), after: criticalPath(unitsOf(before, plan).filter(u => !u.done)) };
  if (turbo) log('run', '', 'critical path', `${critical.before} → ${critical.after} workers`);
  const running = new Map(); // unit id -> { touches, job }
  for (;;) {
    const spec = readSpec();
    for (const s of spec.steps) if (s.done) state[s.id] = 'done';
    const units = unitsOf(spec, plan);
    const ready = units.filter(u => !state[u.id] && u.blockedBy.every(b => state[b] === 'done'));
    for (const u of ready.filter(u => u.mode === 'manual')) { state[u.id] = 'manual'; log(u.id, '', 'step', 'manual: needs the user'); }
    const busy = new Set([...running.values()].flatMap(r => r.touches));
    for (const u of ready.filter(u => u.mode === 'auto')) {
      if (running.size >= jobs) break;
      if (u.touches.some(t => busy.has(t))) continue; // shared file: serialize even if the spec missed the edge
      u.touches.forEach(t => busy.add(t));
      state[u.id] = 'running';
      const job = (u.join ? joinStep(u, spec) : runStep(u, spec)).then(r => { state[u.id] = r; running.delete(u.id); });
      running.set(u.id, { touches: u.touches, job });
    }
    if (!running.size) break;
    await Promise.race([...running.values()].map(r => r.job));
  }
  // A split step that never reached its join takes the state of its first part that did not finish.
  for (const [id, ps] of Object.entries(plan)) state[id] ??= ps.map(p => state[p.id]).find(s => s && s !== 'done');

  const spec = readSpec();
  const notDone = spec.steps.filter(s => state[s.id] !== 'done');
  let finalCheck = { code: 0, out: '' };
  const verify = projectVerify(integ);
  if (!notDone.length) {
    const sync = git(integ, 'merge', '-q', '--no-edit', baseBranch);
    if (sync.code) { git(integ, 'merge', '--abort'); finalCheck = { code: 1, out: `merging ${baseBranch} into the run failed: ${sync.out}` }; }
    else {
      const red = await reviewRun(spec, gitOk(integ, 'merge-base', baseBranch, 'HEAD'));
      if (red.length) finalCheck = { code: 1, out: red.join('; ') };
    }
    const checks = [...spec.steps.map(s => s.check), isWaiver(verify) ? '' : verify].filter(Boolean);
    for (const c of finalCheck.code ? [] : checks) { finalCheck = checkInteg(c); if (finalCheck.code) { finalCheck.out = `${c}: ${finalCheck.out}`; break; } }
    const cov = finalCheck.code ? null : coverage(integ);
    if (cov && !cov.ok) finalCheck = { code: 1, out: `verification coverage red: ${gaps(cov).join(', ')}` };
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
    ...(turbo && { parts: Object.fromEntries(parts.map(p => [p.id, state[p.id] || 'waiting'])), criticalPath: critical }),
    tokens: { ...tokens, total: Object.values(tokens).reduce((a, b) => a + b, 0), ...spent },
    costUsd: { code: usd(cost.code), verification: usd(cost.verification), total: usd(cost.code + cost.verification) },
    verificationShare: Math.round(verificationShare() * 100) / 100, log: logFile };
  fs.writeFileSync(path.join(runDir, 'summary.json'), JSON.stringify(summary, null, 2));
  console.log('\nSUMMARY ' + JSON.stringify(summary));
  process.exit(landed ? 0 : 1);
})().catch(e => { log('run', '', 'crash', e.message); incident('run', `engine crashed: ${e.stack || e.message}`); process.exit(3); });
