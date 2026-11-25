const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const args = process.argv.slice(2);
const prompt = fs.readFileSync(0, 'utf8');
const resumed = args.includes('--resume');
let session = 'none';
// A resumed `claude -p` session reports usage and cost summed over the whole session, not for this call.
const usageFile = () => path.join(require('os').tmpdir(), `fake-claude-${session}-${process.env.FAKE_RUN || ''}.json`);
const reply = (result, tokens) => {
  if (resumed && process.env.FAKE_RUN) tokens += Number(fs.readFileSync(usageFile(), 'utf8'));
  if (process.env.FAKE_RUN) fs.writeFileSync(usageFile(), String(tokens));
  process.stdout.write(JSON.stringify({ result, is_error: false, session_id: session, total_cost_usd: tokens / 10000,
    modelUsage: { m: { inputTokens: tokens - 10, outputTokens: 10, cacheReadInputTokens: 1000, cacheCreationInputTokens: 0 } } }));
};
if (process.env.FAKE_ARGS) fs.appendFileSync(process.env.FAKE_ARGS, args.join(' ') + '\n');

if (prompt.includes('You plan a turbo run')) { reply('```json\n' + (process.env.FAKE_PLAN || '{}') + '\n```', 80); process.exit(0); }
if (prompt.includes('Three-axis review') && process.env.FAKE_REVIEW === 'crash') { process.stdout.write('boom'); process.exit(1); }
if (prompt.includes('Three-axis review')) { reply(process.env.FAKE_REVIEW || '## Standards\nnone\n\nVerdict: ship', 50); process.exit(0); }
const brief = fs.readFileSync(prompt.match(/brief at (.+) and follow/)[1], 'utf8');
if (brief.includes('You extend the verification of one step.')) {
  const mode = process.env.FAKE_VERIFY || 'noop';
  if (mode === 'agents') {
    fs.appendFileSync('AGENTS.md', 'Abdeckung: keine – x\n');
    execSync('git add AGENTS.md && git commit -qm waive');
  } else if (mode !== 'noop') {
    const skills = path.join('.claude', 'skills');
    const dir = fs.readdirSync(skills).filter(n => n.startsWith('verify-')).sort().map(n => path.join(skills, n, 'features'))[0];
    const file = path.join(dir, fs.readdirSync(dir).filter(n => n.endsWith('.md') && n !== 'README.md').sort()[0]);
    fs.writeFileSync(file, fs.readFileSync(file, 'utf8').replace(/^Deckt ab:.*$/m, line => `${line}, \`${mode}\``));
    execSync(`git add -A .claude && git commit -qm cover`);
  }
  reply('Verdict: VERIFIED – verification', 200);
  process.exit(0);
}
const id = brief.match(/# Your step\n### (\S+)/)[1];
session = `sess-${id}`;
if (process.env.FAKE_COMPACT === id) {
  const settings = JSON.parse(fs.readFileSync(path.resolve(args[args.indexOf('--settings') + 1]), 'utf8'));
  for (const h of settings.hooks.PreCompact.flatMap(m => m.hooks)) execSync(h.command, { input: '{"trigger":"auto"}' });
}
if (id === 'review' && process.env.FAKE_FIX_EDIT) {
  fs.appendFileSync(process.env.FAKE_FIX_EDIT, 'weak\n');
  execSync(`git add ${process.env.FAKE_FIX_EDIT} && git commit -qm weaken`);
}
if (process.env.FAKE_EDIT && !resumed) {
  fs.appendFileSync(process.env.FAKE_EDIT, 'weak\n');
  execSync(`git add ${process.env.FAKE_EDIT} && git commit -qm weaken`);
}
// FAKE_RED_ID / FAKE_RED (a counter file): that step's worker commits progress but leaves its check red until the counter runs out.
const slow = process.env.FAKE_RED_ID === id;
const left = slow ? Number(fs.readFileSync(process.env.FAKE_RED, 'utf8')) : 0;
if (left > 0) {
  fs.writeFileSync(process.env.FAKE_RED, String(left - 1));
  fs.writeFileSync(`progress-${left}.txt`, 'p');
  execSync(`git add progress-${left}.txt && git commit -qm progress`);
} else if (slow || (process.env.FAKE_FAIL !== id && !resumed)) {
  fs.writeFileSync(`${id}.txt`, String(process.env.CI));
  execSync(`git add ${id}.txt && git commit -qm "${id}"`);
}
if (process.env.FAKE_BLOCK) reply(`Verdict: BLOCKED – ${process.env.FAKE_BLOCK}`, 100);
else if (process.env.FAKE_NEED && !fs.existsSync(process.env.FAKE_NEED)) reply(`Verdict: BLOCKED – env-gap: ${process.env.FAKE_NEED} missing`, 100);
else reply(`Verdict: VERIFIED – ${id}`, 100);
