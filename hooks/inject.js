// Injects core/rules.md as context. SessionStart only reaches the main thread,
// so SubagentStart repeats it for every subagent.
// Never reads stdin: on Windows the piped JSON can stall and hang the hook.
const fs = require('fs');
const path = require('path');

const event = process.argv[2];
try {
  let context = fs.readFileSync(path.join(__dirname, '..', 'core', 'rules.md'), 'utf8') +
    `\n\nPrinciples index: ${path.join(__dirname, '..', 'core', 'PRINCIPLES.md')} – read it when you start non-trivial work and apply every entry whose "when" matches.`;
  const homeList = path.join(__dirname, '..', '..', 'tstack-verbesserungen');
  const list = process.env.TSTACK_INCIDENTS || (fs.existsSync(homeList) ? path.join(homeList, 'verbesserungen.md') : path.join(require('os').homedir(), '.tstack', 'verbesserungen.md'));
  const open = event === 'SessionStart' && fs.existsSync(list) ? (fs.readFileSync(list, 'utf8').match(/^- \[ \] \[auto /gm) || []).length : 0;
  if (open) context += `\n\n# Offene Tstack-Vorfälle\n\n${open} automatisch erfasste Tstack-Vorfälle stehen offen in ${list}. Biete dem User zu Beginn in einem Satz an, sie zu beheben: je Vorfall Ursache finden, roter Test, Fix an der Ursache, Tstack-Verify, abhaken mit Datum und Commit.`;
  fs.writeSync(1, JSON.stringify({ hookSpecificOutput: { hookEventName: event, additionalContext: context } }));
} catch {
  // Fail open: a missing rules file must never block a session.
}
