// Checks the size and structure rules of DESIGN.md (E13). Exit 1 on any violation.
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const errors = [];
const check = (ok, msg) => { if (!ok) errors.push(msg); };

check(fs.statSync(path.join(root, 'core/rules.md')).size <= 5500, 'core/rules.md > 5.5 KB');

for (const name of fs.readdirSync(path.join(root, 'skills'))) {
  const dir = path.join(root, 'skills', name);
  const file = path.join(dir, 'SKILL.md');
  if (!fs.existsSync(file)) { errors.push(`${name}: no SKILL.md`); continue; }
  const text = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
  const fm = text.match(/^---\n([\s\S]*?)\n---\n/);
  check(fm, `${name}: missing frontmatter`);
  if (fm) {
    check(new RegExp(`^name: ${name}$`, 'm').test(fm[1]), `${name}: name must equal folder`);
    const desc = (fm[1].match(/^description: (.*)$/m) || [])[1] || '';
    check(desc.length > 0 && desc.length <= 1536, `${name}: description missing or > 1536 chars`);
    check(!/disable-model-invocation:\s*true/.test(fm[1]), `${name}: must stay model-invocable (E11)`);
  }
  check(Buffer.byteLength(text) <= (name === 'tstack' ? 12500 : 8000), `${name}: SKILL.md too large`);
  check(text.split('\n').length < 500, `${name}: SKILL.md >= 500 lines`);
  for (const [, link] of text.matchAll(/\]\(([^)#:]+\.md)\)/g)) {
    check(fs.existsSync(path.join(dir, link)), `${name}: broken link ${link}`);
  }
}

// Eval fixtures must stay identical copies (the eval runner only reads files inside each case dir).
const evalDir = path.join(root, 'evals');
const fixtures = fs.readdirSync(evalDir).map(c => path.join(evalDir, c, 'fixture.sh')).concat(path.join(root, 'e2e/_lib/todo-app.sh')).filter(f => fs.existsSync(f));
for (const f of fixtures) check(fs.readFileSync(f, 'utf8') === fs.readFileSync(fixtures[0], 'utf8'), `${path.relative(root, f)} differs from ${path.relative(root, fixtures[0])}`);

// Patch accidents: an escape sequence that became a literal control character, or JS that does not parse.
const { spawnSync } = require('child_process');
const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e =>
  e.name === 'results' || e.name.startsWith('.') ? [] : e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);
for (const f of walk(root).filter(f => /\.(js|md|sh|json)$/.test(f))) {
  if (/[\x00-\x08\x0b\x0e-\x1f]/.test(fs.readFileSync(f, 'utf8'))) errors.push(`${path.relative(root, f)}: control character`);
  if (f.endsWith('.js') && spawnSync(process.execPath, ['--check', f]).status !== 0) errors.push(`${path.relative(root, f)}: syntax error`);
}

if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
console.log('lint ok');
