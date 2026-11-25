// Verification coverage: which changed source files no feature file of the verification covers.
// CLI: node verify-coverage.js [repo-dir] -> exit 0 green, 1 red, one line per gap on stdout.
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const SKIP_DIRS = ['.claude/', 'specs/', '.tstack/', 'docs/'];
const TEST_SEGMENTS = new Set(['test', 'tests', '__tests__', 'e2e', 'fixtures']);
const LOCKFILES = new Set(['package-lock.json', 'pnpm-lock.yaml', 'yarn.lock']);

function isSource(p) {
  const rel = p.replace(/\\/g, '/').replace(/^\.\//, '');
  const segments = rel.split('/');
  const name = segments[segments.length - 1];
  return !(name.endsWith('.md')
    || SKIP_DIRS.some(d => rel.startsWith(d))
    || segments.some(s => TEST_SEGMENTS.has(s))
    || /\.(test|spec)\.|_test\.|^test_/.test(name)
    || LOCKFILES.has(name) || name.endsWith('.lock')
    || name.startsWith('.'));
}

const git = (dir, ...args) => spawnSync('git', ['-c', 'core.quotepath=off', ...args], { cwd: dir, encoding: 'utf8' });
const lines = s => s.split('\n').map(l => l.trim()).filter(Boolean);
const backticked = s => [...s.matchAll(/`([^`]+)`/g)].map(m => m[1]);

function coverage(repoDir) {
  const read = f => fs.readFileSync(f, 'utf8').replace(/\r\n/g, '\n');
  const agents = path.join(repoDir, 'AGENTS.md');
  const result = { ok: true, waived: false, hasMap: false, uncovered: [], undriven: [], problems: [] };
  if (fs.existsSync(agents) && /^(Abdeckung:\s*keine\b|Verify:\s*none\b)/m.test(read(agents))) return { ...result, waived: true };

  const skills = path.join(repoDir, '.claude', 'skills');
  const featureDirs = (fs.existsSync(skills) ? fs.readdirSync(skills) : [])
    .filter(n => n.startsWith('verify-'))
    .map(n => path.join(skills, n, 'features'))
    .filter(d => fs.existsSync(path.join(d, 'README.md')));
  result.hasMap = featureDirs.length > 0;
  if (!result.hasMap) result.problems.push('keine Feature-Map');

  const globs = [];
  const changed = new Set(lines(git(repoDir, 'ls-files', '--others', '--exclude-standard').stdout));
  for (const dir of featureDirs) {
    const rel = f => path.relative(repoDir, f).replace(/\\/g, '/');
    const readme = path.join(dir, 'README.md');
    const sha = (read(readme).match(/^In sync with:\s*`?([0-9a-f]{4,40})`?/m) || [])[1];
    if (!sha) result.problems.push(`${rel(readme)}: In sync with fehlt`);
    else if (git(repoDir, 'cat-file', '-e', `${sha}^{commit}`).status !== 0) result.problems.push(`${rel(readme)}: In sync with ${sha} unbekannt`);
    else lines(git(repoDir, 'diff', '--name-only', '--diff-filter=d', sha).stdout).forEach(f => changed.add(f));

    for (const name of fs.readdirSync(dir).filter(n => n.endsWith('.md') && n !== 'README.md')) {
      const file = path.join(dir, name);
      const text = read(file);
      if (!/^Drive:/m.test(text)) result.undriven.push(rel(file));
      for (const g of backticked((text.match(/^Deckt ab:(.*)$/m) || [])[1] || '')) {
        if (g === '**' || g === '**/*') result.problems.push(`${rel(file)}: Glob ${g} ist ungültig`);
        else globs.push(g);
      }
    }
  }

  result.uncovered = [...changed].filter(isSource).filter(f => !globs.some(g => path.posix.matchesGlob(f, g))).sort();
  result.ok = result.hasMap && !result.problems.length && !result.uncovered.length && !result.undriven.length;
  return result;
}

module.exports = { coverage, isSource };

if (require.main === module) {
  const r = coverage(path.resolve(process.argv[2] || '.'));
  for (const p of r.problems) console.log(p);
  for (const f of r.uncovered) console.log(`nicht abgedeckt: ${f}`);
  for (const f of r.undriven) console.log(`ohne Drive: ${f}`);
  process.exit(r.ok ? 0 : 1);
}
