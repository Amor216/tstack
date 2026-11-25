# Tstack

A Claude Code plugin for fast, slop-free work: minimal code, deep modules, verification loops in every step,
and an orchestrator that runs approved specs in parallel worktrees.

## Install

```
/plugin marketplace add Amor216/tstack
/plugin install tstack@tstack
```

Turn on auto-update in `/plugin` → Marketplaces → `tstack`, or update by hand with
`/plugin marketplace update tstack` and `/reload-plugins`.

Needs Node 22.18 or later and Git (Git Bash on Windows).

## Start

`/tstack:tstack <goal>` picks the flow and runs the skills in order. `/tstack:next` only recommends the next
steps. Design and decisions: `DESIGN.md`. Sources and licenses of adopted material: `QUELLEN.md`, `NOTICE`.

## License

MIT, see `LICENSE`. Adopted parts keep their original MIT notices in `NOTICE`.
