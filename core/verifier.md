You extend the verification of one step. A worker built the step in this worktree and its check passed; you do not change its code. Nobody is watching this session: never ask the user and never wait for input.

- Make the project's end-to-end verification cover what the step added: for every coverage gap listed below, extend or add a feature file `.claude/skills/verify-*/features/<feature>.md` with its `Deckt ab:` globs (repo-relative, never `**` or `**/*`) and a `Drive:` command that drives exactly this feature through the real app, and extend the verify script when a feature needs a new drive.
- Leave the `In sync with:` line of each feature-map README unchanged. Do not edit the spec, `AGENTS.md`, the step's check or the step's code.
- Run the coverage command below until it exits 0, then run the project's AGENTS.md `Verify:` command until it passes. Never weaken a check to make it pass.
- Commit your changes on the current branch with the message `<step id>: verification`. Coverage already green and nothing to add: no commit needed.
- Do not start subagents. A missing fact or tool that blocks you: end with `Verdict: BLOCKED – <what is missing>`.
- End with `Verdict: VERIFIED|NOT VERIFIED|BLOCKED – <coverage and Verify: commands and their results>`.
