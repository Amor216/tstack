// Workspace scaffold: copies the template tree into <ziel> without overwriting, then git init in <ziel>/Home.
// CLI: node arbeitsordner.js <ziel> -> one line per template file (angelegt|vorhanden <pfad>), exit 0.
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const VORLAGE = path.join(__dirname, '..', 'skills', 'workspace', 'references', 'arbeitsordner');

const dateien = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e =>
  e.isDirectory() ? dateien(path.join(d, e.name)) : [path.join(d, e.name)]);

function einrichten(ziel) {
  const result = { angelegt: [], vorhanden: [], gitInit: false };
  for (const quelle of dateien(VORLAGE)) {
    const rel = path.relative(VORLAGE, quelle).replace(/\\/g, '/').replace(/\.vorlage$/, '');
    const datei = path.join(ziel, rel);
    if (fs.existsSync(datei)) { result.vorhanden.push(rel); continue; }
    fs.mkdirSync(path.dirname(datei), { recursive: true });
    fs.writeFileSync(datei, fs.readFileSync(quelle, 'utf8').replace(/\r\n/g, '\n'), { flag: 'wx' });
    result.angelegt.push(rel);
  }
  const home = path.join(ziel, 'Home');
  if (!fs.existsSync(path.join(home, '.git'))) {
    const r = spawnSync('git', ['init', '-q', home], { encoding: 'utf8' });
    if (r.status !== 0) throw new Error(`git init ${home}: ${r.stderr || r.error}`);
    result.gitInit = true;
  }
  return result;
}

if (require.main === module) {
  const ziel = process.argv[2];
  if (!ziel) { console.error('Nutzung: node arbeitsordner.js <ziel>'); process.exit(1); }
  const r = einrichten(ziel);
  const zeilen = [...r.angelegt.map(p => `angelegt ${p}`), ...r.vorhanden.map(p => `vorhanden ${p}`)];
  if (r.gitInit) zeilen.push('git init Home');
  console.log(zeilen.join('\n'));
}

module.exports = { einrichten };
