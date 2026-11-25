// PreToolUse hook: no code change in a git project before its end-to-end verification exists.
// Allowed: docs, AGENTS.md, specs/, .claude/ (so /tstack:verify-setup can build the environment),
// any change once .claude/skills/verify-*/DESIGN.md exists (design agreed, setup in progress),
// or an explicit waiver line `Verify: none – <reason>` in AGENTS.md. Fails open on any doubt.
const fs = require('fs');
const path = require('path');
const { gitRoot, onPrototypeBranch } = require('./git');

const EDIT = new Set(['Edit', 'Write', 'MultiEdit', 'NotebookEdit']);
const FREE = /(^|\/)(AGENTS\.md|CLAUDE\.md|specs\/.*|\.claude\/.*|\.tstack\/.*|[^/]*\.(md|mdx|txt))$/i;

function decide(input) {
  if (!EDIT.has(input.tool_name)) return null;
  const file = input.tool_input?.file_path || input.tool_input?.notebook_path;
  if (!file) return null;
  const abs = path.resolve(input.cwd || process.cwd(), file);
  const root = gitRoot(path.dirname(abs));
  if (!root) return null;
  const rel = path.relative(root, abs).split(path.sep).join('/');
  if (FREE.test(rel) || onPrototypeBranch(root)) return null;
  const agents = path.join(root, 'AGENTS.md');
  if (fs.existsSync(agents) && /^Verify:/m.test(fs.readFileSync(agents, 'utf8'))) return null;
  const skills = path.join(root, '.claude', 'skills');
  if (fs.existsSync(skills) && fs.readdirSync(skills).some(d => d.startsWith('verify-') && fs.existsSync(path.join(skills, d, 'DESIGN.md')))) return null;
  return `This project has no end-to-end verification yet (no \`Verify:\` line in AGENTS.md). ` +
    'Run /tstack:verify-setup first: it designs the verification with the user and gives the agent its tools. ' +
    'If the user explicitly waives it for this project, add `Verify: none – <reason>` to AGENTS.md.';
}

let raw = '';
const finish = () => {
  try {
    const reason = decide(JSON.parse(raw.replace(/^﻿/, '')));
    if (reason) fs.writeSync(1, JSON.stringify({ hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'deny', permissionDecisionReason: reason } }));
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
