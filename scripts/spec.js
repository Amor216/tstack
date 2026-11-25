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
function gamedCheckFiles(check, changed, touches) {
  const allowed = f => touches.some(t => f === t || f.endsWith('/' + t));
  return check.split(/\s+/).map(tok => tok.replace(/^\.\//, '')).filter(f => changed.includes(f) && !allowed(f));
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

module.exports = { parseSpec, gamedCheckFiles, specProblems };
