const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const args = process.argv.slice(2);
const prompt = fs.readFileSync(0, 'utf8');
const reply = (result, tokens) => {
  process.stdout.write(JSON.stringify({ result, is_error: false, total_cost_usd: tokens / 10000,
    modelUsage: { m: { inputTokens: tokens - 10, outputTokens: 10, cacheReadInputTokens: 0, cacheCreationInputTokens: 0 } } }));
};

if (prompt.includes('You review one step')) { reply(process.env.FAKE_VERDICT || 'VERDICT: PASS', 50); process.exit(0); }
const brief = fs.readFileSync(prompt.match(/brief at (.+) and follow/)[1], 'utf8');
const id = brief.match(/# Your step\n### (\S+)/)[1];
if (process.env.FAKE_COMPACT === id) {
  const settings = JSON.parse(fs.readFileSync(path.resolve(args[args.indexOf('--settings') + 1]), 'utf8'));
  for (const h of settings.hooks.PreCompact.flatMap(m => m.hooks)) execSync(h.command, { input: '{"trigger":"auto"}' });
}
if (process.env.FAKE_EDIT) {
  fs.appendFileSync(process.env.FAKE_EDIT, 'weak\n');
  execSync(`git add ${process.env.FAKE_EDIT} && git commit -qm weaken`);
}
if (process.env.FAKE_FAIL !== id) {
  fs.writeFileSync(`${id}.txt`, String(process.env.CI));
  execSync(`git add ${id}.txt && git commit -qm "${id}"`);
}
if (process.env.FAKE_NEED && !fs.existsSync(process.env.FAKE_NEED)) reply(`Verdict: BLOCKED – env-gap: ${process.env.FAKE_NEED} missing`, 100);
else reply(`Verdict: VERIFIED – ${id}`, 100);
