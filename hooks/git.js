// Git facts the hooks need, read from the filesystem (no git process, works in worktrees).
const fs = require('fs');
const path = require('path');

// The nearest directory at or above `dir` that holds .git (a folder, or a file in a worktree).
function gitRoot(dir) {
  for (let d = dir; ; d = path.dirname(d)) {
    if (fs.existsSync(path.join(d, '.git'))) return d;
    if (path.dirname(d) === d) return null;
  }
}

// Throwaway prototypes (/tstack:prototype) live on prototype/* branches and are never merged.
function onPrototypeBranch(root) {
  try {
    let gitDir = path.join(root, '.git');
    if (fs.statSync(gitDir).isFile()) gitDir = path.resolve(root, fs.readFileSync(gitDir, 'utf8').replace(/^gitdir:\s*/, '').trim());
    return /^ref: refs\/heads\/prototype\//.test(fs.readFileSync(path.join(gitDir, 'HEAD'), 'utf8'));
  } catch {
    return false;
  }
}

module.exports = { gitRoot, onPrototypeBranch };
