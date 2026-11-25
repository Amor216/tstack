// Usage: node status.js [repo] [--watch] [--all]
const fs = require('fs');
const path = require('path');
const { parseSpec } = require('./spec.js');

const alive = pid => { try { process.kill(pid, 0); return true; } catch (e) { return e.code === 'EPERM'; } };
const read = f => fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : '';
const k = n => n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : `${Math.round(n / 1e3)}k`;
const mins = ms => `${Math.max(0, Math.round(ms / 60000))}m`;

function load(repo) {
  const runs = path.join(repo, '.tstack', 'runs');
  if (!fs.existsSync(runs)) return [];
  return fs.readdirSync(runs).sort().reverse().map(id => {
    const dir = path.join(runs, id);
    const rows = read(path.join(dir, 'log.tsv')).trim().split('\n').slice(1).filter(Boolean)
      .map(l => { const [ts, step, attempt, phase, result, evidence, tokens] = l.split('\t');
        return { ts: new Date(ts), step, attempt, phase, result, evidence, tokens: Number(tokens) || 0 }; });
    const start = rows.find(r => r.step === 'run' && /start|resume/.test(r.phase));
    const specRel = start ? start.evidence.split(' on ')[0] : '';
    const integ = path.join(repo, '.tstack', 'wt', id, 'integration');
    const summary = JSON.parse(read(path.join(dir, 'summary.json')) || 'null');
    const pid = Number(read(path.join(dir, 'pid')));
    return { id, specRel, mode: start ? start.result : '', rows, summary,
      live: !summary && (pid > 0 ? alive(pid) : fs.existsSync(path.join(integ, '.git')) && Date.now() - fs.statSync(path.join(dir, 'log.tsv')).mtimeMs < 30 * 60000),
      steps: specRel ? parseSpec(read(path.join(integ, specRel)) || read(path.join(repo, specRel))).steps : [] };
  });
}

const PHASE = { worker: { started: 'Worker', finished: 'Prüfung', error: 'Prüfung' }, check: 'Merge', verifier: { started: 'Verifikation', finished: 'Prüfung', error: 'Prüfung', rejected: 'Worker' },
  merge: 'Worker', join: 'Schritt-Prüfung' };
const ICON = { done: '✔', running: '▶', failed: '✖', blocked: '⏸', manual: '⏸', split: '✂', waiting: '○' };
const LABEL = { failed: 'gescheitert', blocked: 'blockiert, braucht dich', manual: 'manuell, braucht dich',
  split: 'Kontext voll, Schritt aufteilen' };

function stateOf(run, step, rows) {
  if (run.summary) return run.summary.steps[step.id] || 'waiting';
  if (step.done || rows.some(r => r.step === step.id && r.phase === 'merge' && r.result === 'merged')) return 'done';
  const end = rows.find(r => r.phase === 'step');
  if (end) return /^split/.test(end.result) ? 'split' : /manual/.test(end.result) ? 'manual' : /blocked/.test(end.result) ? 'blocked' : 'failed';
  return rows.length && run.live ? 'running' : 'waiting';
}

function render(run, now = new Date()) {
  const total = run.rows.reduce((n, r) => n + r.tokens, 0);
  const t0 = run.rows[0] ? run.rows[0].ts : now;
  const t1 = run.live ? now : (run.rows[run.rows.length - 1] || {}).ts || now;
  const status = run.live ? 'läuft' : run.summary ? (run.summary.landed ? 'gelandet' : 'nicht gelandet') : 'abgebrochen';
  const out = [`Lauf ${run.id}  ${run.specRel}  ${status} ${mins(t1 - t0)}  ${run.mode}  ${k(total)} Tokens`,
    `  Integration: tstack/${run.id}`];
  const depth = {};
  const d = s => depth[s.id] ??= s.blockedBy.length
    ? 1 + Math.max(...s.blockedBy.map(b => { const p = run.steps.find(x => x.id === b); return p ? d(p) : 0; })) : 0;
  for (const s of run.steps) {
    // turbo parts of a split step log as <step>.<letter>; they count toward their step
    const parts = [...new Set(run.rows.map(r => r.step).filter(id => id.startsWith(s.id + '.')))];
    const rows = run.rows.filter(r => r.step === s.id || parts.includes(r.step));
    const state = stateOf(run, s, rows);
    const last = rows.filter(r => PHASE[r.phase]).pop() || rows[rows.length - 1];
    const tokens = rows.reduce((n, r) => n + r.tokens, 0);
    let info = LABEL[state] || '';
    if (state === 'done') info = `fertig  ${(rows.find(r => r.phase === 'merge') || {}).evidence || ''}`;
    if (state === 'running') {
      const phase = PHASE[last.phase];
      const started = [...rows].reverse().find(r => r.phase === 'worker' && r.result === 'started');
      info = parts.length && last.step !== s.id ? `parallel in ${parts.length} Teilen seit ${mins(now - rows[0].ts)}`
        : `${(typeof phase === 'string' ? phase : (phase || {})[last.result]) || 'Prüfung'} Runde ${last.attempt || started.attempt} seit ${mins(now - started.ts)}  ${path.basename(started.evidence)}`;
    }
    if (state === 'waiting') {
      const open = s.blockedBy.filter(b => stateOf(run, run.steps.find(x => x.id === b) || { id: b, done: true }, run.rows.filter(r => r.step === b)) !== 'done');
      info = open.length ? `wartet auf ${open.join(', ')}` : 'bereit';
    }
    const indent = d(s) ? '  '.repeat(d(s)) + '└ ' : '';
    out.push(`  ${indent}${ICON[state]} ${s.id} ${s.title}  ${info}${tokens ? '  ' + k(tokens) : ''}`);
    const partState = p => run.summary?.parts?.[p] || stateOf(run, { id: p }, run.rows.filter(r => r.step === p));
    if (parts.length) out.push(`  ${' '.repeat(indent.length)}    Teile: ${parts.map(p => `${ICON[partState(p)]} ${p}`).join('  ')}`);
  }
  const review = run.rows.find(r => r.step === 'run' && r.phase === 'review');
  const fix = run.rows.filter(r => r.step === 'review' && r.phase === 'worker').pop();
  const allDone = run.steps.length && run.steps.every(s => stateOf(run, s, run.rows.filter(r => r.step === s.id)) === 'done');
  if (review || (run.live && allDone)) {
    out.push(`  Review am Ende: ${!review ? 'läuft' : review.result === 'ship' ? 'ohne Befund'
      : `Befunde, Fix-Worker ${!fix || fix.result === 'started' ? 'läuft' : 'fertig'}`}`);
  }
  if (status === 'abgebrochen' || status === 'nicht gelandet') out.push(`  weiter: node gid.js ${run.specRel} --resume ${run.id}`);
  return out.join('\n');
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const repo = path.resolve(args.find(a => !a.startsWith('--')) || '.');
  const show = () => {
    const runs = load(repo);
    const shown = args.includes('--all') ? runs : runs.filter((r, i) => r.live || i === 0);
    return shown.length ? shown.map(r => render(r)).join('\n\n') : 'Keine get-it-done-Läufe in ' + repo;
  };
  if (!args.includes('--watch')) { console.log(show()); return; }
  const tick = () => {
    console.clear();
    console.log(show() + '\n\n(aktualisiert alle 2 s, Strg+C beendet)');
    if (!load(repo).some(r => r.live)) process.exit(0);
  };
  tick();
  setInterval(tick, 2000);
}

module.exports = { load, render };
