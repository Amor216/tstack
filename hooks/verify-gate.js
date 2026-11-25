// Stop hook: blocks "done" when code changed this turn without a check run after the last edit,
// a Verdict line, or (with a feature map) green verification coverage. Fails open on any doubt so it never traps a session.
const fs = require('fs');

const DOC = /\.(md|mdx|txt|rst)$/i;
const SHELL = new Set(['Bash', 'PowerShell']);
const EDIT = new Set(['Edit', 'Write', 'MultiEdit', 'NotebookEdit']);
const VERDICT = /Verdict:\s*(VERIFIED|NOT VERIFIED|BLOCKED)/;
const path = require('path');
const { gitRoot, onPrototypeBranch } = require('./git');
const { coverage } = require('../scripts/verify-coverage');

// The project's end-to-end verification command from AGENTS.md (`Verify: ...`), if any.
function verifyCommand(cwd) {
  for (let d = cwd; d; d = path.dirname(d) === d ? null : path.dirname(d)) {
    const agents = path.join(d, 'AGENTS.md');
    if (fs.existsSync(agents)) {
      const m = fs.readFileSync(agents, 'utf8').match(/^Verify:\s*`?([^`\n]+)`?/m);
      return m && !/^none\b/i.test(m[1].trim()) ? m[1].trim() : '';
    }
    if (fs.existsSync(path.join(d, '.git'))) return '';
  }
  return '';
}
// A shell command counts as the verification run if it contains the command's most specific token
// (a script path), or the whole command when it has no path-like token.
const norm = s => s.replace(/\\/g, '/').replace(/\s+/g, ' ').trim();
function runsVerify(shellCmd, verify) {
  const tokens = norm(verify).split(' ').filter(t => /[/.]/.test(t) && t.length > 3 && !/^-/.test(t));
  const key = tokens.sort((a, b) => b.length - a.length)[0] || norm(verify);
  return norm(shellCmd).includes(key);
}

function decide(input) {
  if (input.stop_hook_active) return null;
  const lines = fs.readFileSync(input.transcript_path, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l));
  const isUserPrompt = e => e.type === 'user' && !(Array.isArray(e.message?.content) && e.message.content.some(b => b.type === 'tool_result'));
  const start = lines.findLastIndex(isUserPrompt);
  const turn = lines.slice(start + 1);
  const failed = new Set(turn.flatMap(e => (Array.isArray(e.message?.content) ? e.message.content : []))
    .filter(b => b.type === 'tool_result' && b.is_error).map(b => b.tool_use_id));
  const events = turn.filter(e => e.type === 'assistant').flatMap(e => e.message?.content || []);
  const lastEdit = events.findLastIndex(b => b.type === 'tool_use' && EDIT.has(b.name) && !failed.has(b.id) &&
    !DOC.test(b.input?.file_path || b.input?.notebook_path || ''));
  if (lastEdit < 0) return null;
  const root = gitRoot(input.cwd || process.cwd());
  if (root && onPrototypeBranch(root)) return null;
  const verify = verifyCommand(input.cwd || process.cwd());
  const shells = events.slice(lastEdit + 1).filter(b => b.type === 'tool_use' && SHELL.has(b.name)).map(b => b.input?.command || '');
  const checked = verify ? shells.some(c => runsVerify(c, verify)) : shells.length > 0;
  const lastText = events.filter(b => b.type === 'text').pop()?.text || '';
  if (checked && VERDICT.test(lastText)) {
    const cov = root ? coverage(root) : null;
    if (!cov?.hasMap || cov.ok) return null;
    const gaps = [...cov.problems, ...cov.uncovered.map(f => `not covered: ${f}`), ...cov.undriven.map(f => `no Drive: ${f}`)];
    return `Verification coverage is red (${gaps.join('; ')}). Run /tstack:verify-maintain to extend the feature map ` +
      'and the verify script, run the verification again, then end with a Verdict line.';
  }
  const what = verify ? `the project's verification \`${verify}\`` : 'a check (tests, typecheck or build)';
  return 'Code changed in this turn, but ' + (checked ? 'the reply has no Verdict line' : `${what} did not run after the last edit`) +
    `. Run ${what}, fix until it passes, run it again, then end with ` +
    '`Verdict: VERIFIED|NOT VERIFIED|BLOCKED – <command and result>`.';
}

let raw = '';
const finish = () => {
  try {
    const reason = decide(JSON.parse(raw.replace(/^﻿/, '')));
    if (reason) fs.writeSync(1, JSON.stringify({ decision: 'block', reason }));
  } catch {
    // fail open
  }
  process.exit(0);
};
process.stdin.setEncoding('utf8');
process.stdin.on('data', c => { raw += c; });
process.stdin.on('end', finish);
process.stdin.on('error', finish);
setTimeout(finish, 1000); // stays ref'd: on Windows stdin may never end
