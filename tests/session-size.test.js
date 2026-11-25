const { test } = require('node:test');
const assert = require('node:assert');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const HOOK = path.join(__dirname, '..', 'hooks', 'session-size.js');
const turn = (tokens, isSidechain = false) => ({ type: 'assistant', isSidechain,
  message: { usage: { input_tokens: 2, cache_creation_input_tokens: 0, cache_read_input_tokens: tokens - 2, output_tokens: 50 } } });

function session() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'size-'));
  const file = path.join(dir, 't.jsonl');
  return events => {
    fs.writeFileSync(file, events.map(e => JSON.stringify(e)).join('\n') + '\n');
    const out = spawnSync('node', [HOOK], { input: JSON.stringify({ session_id: 's1', transcript_path: file }),
      env: { ...process.env, TSTACK_STATE_DIR: dir } }).stdout.toString();
    return out ? JSON.parse(out) : null;
  };
}

test('below the first threshold: silent', () => assert.equal(session()([turn(90000)]), null));

test('past 150k: one hint for the user and the model, then silent until 400k, then one strong warning', () => {
  const run = session();
  const hint = run([turn(90000), turn(160000)]);
  assert.match(hint.systemMessage, /160k/);
  assert.match(hint.systemMessage, /neue Session/);
  assert.equal(hint.hookSpecificOutput.hookEventName, 'UserPromptSubmit');
  assert.match(hint.hookSpecificOutput.additionalContext, /handoff/i);
  assert.equal(run([turn(200000)]), null);
  assert.match(run([turn(420000)]).systemMessage, /420k/);
  assert.equal(run([turn(500000)]), null);
});

test('subagent turns do not count', () => assert.equal(session()([turn(90000), turn(300000, true)]), null));

test('broken input fails open', () => {
  const r = spawnSync('node', [HOOK], { input: 'not json' });
  assert.equal(r.status, 0);
  assert.equal(r.stdout.toString(), '');
});
