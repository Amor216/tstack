// Spec parsing for the get-it-done engine (gid.js), apart from it so it can be tested without starting a run.

// A field is its own line plus the indented lines below it ("- Berührt:" followed by a nested list).
const fieldOf = (sec, name) => {
  const m = sec.match(new RegExp(`^- ${name}:[ \\t]*(.*)((?:\\n[ \\t]+.*)*)`, 'mi'));
  return m ? (m[1] + m[2]).trim() : '';
};
const list = s => s.split(/[,;]/).map(x => x.trim()).filter(x => x && !/^(keine|none|-)$/i.test(x));
// a backticked token is a path when it has no spaces and a slash or a file extension
const paths = s => [...s.matchAll(/`([^`\s]+)`/g)].map(m => m[1]).filter(p => p.includes('/') || /\.\w+$/.test(p));

function parseSpec(text) {
  const parts = text.replace(/\r\n/g, '\n').split(/^### /m);
  const steps = parts.slice(1).map(sec => {
    const id = sec.match(/^(\S+)/)[1];
    const touched = fieldOf(sec, 'Berührt');
    return {
      id,
      title: sec.split('\n')[0].slice(id.length).trim(),
      done: /^- \[x\]/mi.test(sec),
      blockedBy: list(fieldOf(sec, 'Blockiert durch')).map(x => x.split(/\s/)[0]),
      mode: /manual/i.test(fieldOf(sec, 'Modus')) ? 'manual' : 'auto',
      touches: paths(touched).length ? paths(touched) : list(touched),
      noTouches: /^(keine|none|-)$/i.test(touched),
      check: (fieldOf(sec, 'Prüfbefehl').match(/`([^`]+)`/) || [])[1] || '',
      section: '### ' + sec.trim(),
    };
  });
  return { header: parts[0], steps };
}

// Anti-gaming: changed files the check command names. A file the step may touch per "Berührt" is allowed:
// a grep check on the file the step must change, or the verify script a "Verifikation erweitern" step extends.
const covers = (touches, f) => touches.some(t => f === t || f.endsWith('/' + t) || (t.endsWith('/') && f.startsWith(t)));
function gamedCheckFiles(check, changed, touches) {
  return check.split(/\s+/).map(tok => tok.replace(/^\.\//, '')).filter(f => changed.includes(f) && !covers(touches, f));
}

// Turbo: the planner's answer per open auto step is either a reason to keep it whole or a list of parts that run
// as units of their own. A split that does not hold up is dropped with the reason: that step then runs whole.
function planParts(spec, raw) {
  const plan = {}, kept = {}, problems = [];
  const open = spec.steps.filter(s => !s.done && s.mode === 'auto');
  for (const s of open) if (!(s.id in (raw || {}))) problems.push(`${s.id}: no decision from the planner`);
  for (const [id, answer] of Object.entries(raw || {})) {
    const step = open.find(s => s.id === id);
    if (!step) { problems.push(`${id}: not an open auto step`); continue; }
    if (typeof answer === 'string') { kept[id] = answer; continue; }
    const why = splitProblems(step, answer);
    if (why.length) { problems.push(...why); continue; }
    plan[id] = answer.map(p => ({
      id: p.id, title: p.title, part: id, mode: 'auto', touches: p.touches, noTouches: false, check: p.check, blockedBy: p.blockedBy || [],
      section: [`### ${p.id} ${p.title}`, `- Teil von: ${id} (only this part; the other parts of ${id} run at the same time in other worktrees)`,
        `- Liefert: ${p.deliver}`, `- Berührt: ${p.touches.map(t => `\`${t}\``).join(', ')}`, `- Prüfbefehl: \`${p.check}\``,
        '', `The whole step, for context:`, step.section.replace(/^###/, '####')].join('\n'),
    }));
  }
  return { plan, kept, problems };
}
function splitProblems(step, parts) {
  if (!Array.isArray(parts) || parts.length < 2) return [`${step.id}: fewer than two parts, not a split`];
  const ids = parts.map(p => p && p.id);
  const out = [];
  for (const p of parts) {
    const bad = why => out.push(`${p && p.id}: ${why}`);
    if (!p || typeof p.id !== 'string' || !p.id.startsWith(step.id + '.')) { bad(`part id must start with ${step.id}.`); continue; }
    if (ids.indexOf(p.id) !== ids.lastIndexOf(p.id)) bad('part id appears twice');
    if (!p.title || !p.deliver) bad('title or deliver missing');
    if (!p.check) bad('no check command');
    if (!Array.isArray(p.touches) || !p.touches.length) bad('touches missing');
    else for (const f of p.touches.filter(f => !covers(step.touches, f))) bad(`touches ${f}, which is outside the step's Berührt`);
    for (const b of (p.blockedBy || []).filter(b => !step.blockedBy.includes(b) && !ids.includes(b))) bad(`blockedBy ${b}: only the step's own edges or sibling parts`);
  }
  if (!out.length && criticalPath(parts.map(p => ({ id: p.id, blockedBy: p.blockedBy || [] }))) < 0) out.push(`${step.id}: parts form a cycle`);
  return out;
}

// Longest chain of workers through the units; a join adds no worker when its parts already make its check pass. -1 on a cycle.
function criticalPath(units) {
  const byId = new Map(units.map(u => [u.id, u]));
  const memo = new Map();
  const len = (u, seen) => {
    if (memo.has(u.id)) return memo.get(u.id);
    if (seen.has(u.id)) throw new Error('cycle');
    const n = Math.max(0, ...u.blockedBy.filter(b => byId.has(b)).map(b => len(byId.get(b), new Set([...seen, u.id])))) + (u.join ? 0 : 1);
    memo.set(u.id, n);
    return n;
  };
  try { return Math.max(0, ...units.map(u => len(u, new Set()))); } catch { return -1; }
}

function specProblems(spec) {
  const ids = spec.steps.map(s => s.id);
  const out = ids.filter((id, i) => ids.indexOf(id) !== i).map(id => `${id}: step id appears twice`);
  for (const s of spec.steps.filter(s => !s.done && s.mode === 'auto')) {
    for (const b of s.blockedBy.filter(b => !ids.includes(b))) out.push(`${s.id}: Blockiert durch names unknown step ${b}`);
    if (!s.touches.length && !s.noTouches) out.push(`${s.id}: Berührt is missing or reads empty (write the files, or "keine")`);
    if (!s.check) out.push(`${s.id}: no Prüfbefehl in backticks`);
  }
  return out;
}

module.exports = { parseSpec, gamedCheckFiles, specProblems, planParts, criticalPath };
