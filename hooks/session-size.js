// UserPromptSubmit: once per threshold, tells the user the context is large enough that a fresh session
// answers better. Thresholds: tstack-verbesserungen/recherche-session-limit.md. Fails open.
const fs = require('fs');
const os = require('os');
const path = require('path');

const LEVELS = [
  [400000, 'deutlich: Antworten werden ab hier messbar unzuverlässiger. Jetzt eine neue Session starten'],
  [150000, 'ab hier sinkt die Qualität messbar. Nach dem laufenden Schritt eine neue Session starten'],
];

function contextTokens(transcript) {
  const fd = fs.openSync(transcript, 'r');
  const size = fs.fstatSync(fd).size;
  const tail = Buffer.alloc(Math.min(size, 4 * 1024 * 1024));
  fs.readSync(fd, tail, 0, tail.length, size - tail.length);
  fs.closeSync(fd);
  const last = tail.toString('utf8').split('\n').reverse().flatMap(l => { try { return [JSON.parse(l)]; } catch { return []; } })
    .find(e => e.type === 'assistant' && !e.isSidechain && e.message?.usage);
  const u = last.message.usage;
  return u.input_tokens + (u.cache_creation_input_tokens || 0) + (u.cache_read_input_tokens || 0);
}

function check(raw) {
  const input = JSON.parse(raw);
  const tokens = contextTokens(input.transcript_path);
  const level = LEVELS.find(([min]) => tokens >= min);
  if (!level) return;
  const mark = path.join(process.env.TSTACK_STATE_DIR || os.tmpdir(), `tstack-size-${input.session_id}-${level[0]}`);
  if (fs.existsSync(mark)) return;
  fs.writeFileSync(mark, String(tokens));
  const k = Math.round(tokens / 1000);
  fs.writeSync(1, JSON.stringify({
    systemMessage: `Kontext bei ${k}k Tokens – ${level[1]}.`,
    hookSpecificOutput: { hookEventName: 'UserPromptSubmit', additionalContext:
      `The context holds ${k}k tokens. After answering this prompt, tell the user in one line to start a new session ` +
      'after the current unit of work, and offer a short handoff (goal, state, open steps, files) to paste into it.' },
  }));
}

let raw = '';
let done = false;
function finish() {
  if (done) return;
  done = true;
  try { check(raw); } catch {}
  process.exit(0);
}
process.stdin.setEncoding('utf8');
process.stdin.on('data', c => { raw += c; });
process.stdin.on('end', finish);
process.stdin.on('error', finish);
setTimeout(finish, 1000); // stays ref'd: on Windows stdin may never end
