const { test } = require('node:test');
const assert = require('node:assert');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { einrichten } = require('../scripts/arbeitsordner.js');

const CLI = path.join(__dirname, '..', 'scripts', 'arbeitsordner.js');
const VORLAGE = path.join(__dirname, '..', 'skills', 'workspace', 'references', 'arbeitsordner');
const ERWARTET = ['Home/AGENTS.md', 'Home/CLAUDE.md', 'Home/.gitignore', 'Home/.claude/settings.json',
  'Home/skills/README.md', 'Home/Anleitungen/README.md', 'Home/tstack-verbesserungen/verbesserungen.md',
  'Projekte/context.md', 'Karriere/context.md', 'Sammlung/context.md', 'Tabs/context.md', 'Archiv/context.md'];

const leer = () => fs.mkdtempSync(path.join(os.tmpdir(), 'ao-'));
const cli = (...args) => spawnSync('node', [CLI, ...args], { encoding: 'utf8' });
const dateien = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.name === '.git' ? []
  : e.isDirectory() ? dateien(path.join(d, e.name)) : [path.join(d, e.name)]);
const inhalt = ziel => Object.fromEntries(dateien(ziel).map(f => [f, fs.readFileSync(f, 'utf8')]));

test('leerer Ordner: ganzes Gerüst, git init', () => {
  const ziel = leer();
  const r = cli(ziel);
  assert.equal(r.status, 0, r.stderr);
  for (const f of ERWARTET) assert.ok(fs.existsSync(path.join(ziel, f)), f);
  assert.equal(fs.readFileSync(path.join(ziel, 'Home/CLAUDE.md'), 'utf8'), '@AGENTS.md\n');
  assert.ok(fs.existsSync(path.join(ziel, 'Home/.git')));
  const settings = JSON.parse(fs.readFileSync(path.join(ziel, 'Home/.claude/settings.json'), 'utf8'));
  assert.deepEqual(settings.permissions.additionalDirectories, ['../Projekte', '../Karriere', '../Sammlung', '../Tabs', '../Archiv']);
  assert.match(r.stdout, /^angelegt Home\/AGENTS\.md$/m);
  assert.match(r.stdout, /^git init Home$/m);
  assert.ok(!dateien(ziel).some(f => f.endsWith('.vorlage')));

  const status = spawnSync('git', ['-C', path.join(ziel, 'Home'), 'status', '--porcelain'], { encoding: 'utf8' }).stdout;
  for (const f of ['AGENTS.md', 'CLAUDE.md', '.gitignore', '.claude/']) assert.match(status, new RegExp(`^\\?\\? ${f.replace('.', '\\.')}$`, 'm'), f);

  const agents = fs.readFileSync(path.join(ziel, 'Home/AGENTS.md'), 'utf8');
  for (const h of ['Bereiche', 'Projekte', 'Gemeinsame Regeln', 'Skills', 'Anleitungen', 'Tstack-Verbesserungen']) {
    assert.match(agents, new RegExp(`^## ${h}`, 'm'), h);
  }
});

test('zweiter Lauf: alles vorhanden, nichts geändert', () => {
  const ziel = leer();
  cli(ziel);
  const vorher = inhalt(ziel);
  const r = cli(ziel);
  assert.equal(r.status, 0, r.stderr);
  const zeilen = r.stdout.trim().split(/\r?\n/);
  assert.equal(zeilen.length, ERWARTET.length);
  assert.ok(zeilen.every(z => z.startsWith('vorhanden ')), r.stdout);
  assert.deepEqual(inhalt(ziel), vorher);
});

test('eigene AGENTS.md bleibt, Rest wird angelegt', () => {
  const ziel = leer();
  fs.mkdirSync(path.join(ziel, 'Home'));
  const eigen = Buffer.from('# Meins\r\neigener Text\n');
  fs.writeFileSync(path.join(ziel, 'Home/AGENTS.md'), eigen);
  const r = einrichten(ziel);
  assert.deepEqual(fs.readFileSync(path.join(ziel, 'Home/AGENTS.md')), eigen);
  assert.deepEqual(r.vorhanden, ['Home/AGENTS.md']);
  assert.equal(r.angelegt.length, ERWARTET.length - 1);
  assert.equal(r.gitInit, true);
  for (const f of ERWARTET) assert.ok(fs.existsSync(path.join(ziel, f)), f);
});

test('ohne Argument: Exit 1', () => {
  const r = cli();
  assert.equal(r.status, 1);
  assert.match(r.stderr, /arbeitsordner\.js <ziel>/);
});

test('Vorlagenbaum ohne persönliche Inhalte', () => {
  for (const f of dateien(VORLAGE)) {
    const text = fs.readFileSync(f, 'utf8');
    for (const verboten of [/Amor216/, /github\.com\//, /Claude/, /Anthropic/, /[\w.+-]+@[\w-]+\.[\w.]+/]) {
      assert.doesNotMatch(text, verboten, path.relative(VORLAGE, f));
    }
  }
});
