# Comments: what may stay

From pstack comment-sicko (MIT). Every comment not covered by this list is deleted.

- Legal or license headers.
- Non-obvious behaviour forced by an external dependency, platform, vendor or protocol we cannot reshape. A surprise in our own code is not a keep reason: delete the comment and list the symbol under "skipped – needs reshape" in the reply (rename, extract, type or restructure so the behaviour is obvious without prose).
- `// prettier-ignore`. Lint suppressions stay only when their rule is faulty, pedantic or style-only; a suppression of a rule that catches real bugs or protects correctness is removed and the code fixed.
- Doc comments that define a public API contract.
- Issue or RFC links that explain a constraint code cannot express.

When unsure whether a keep reason applies, the comment goes. `IMPORTANT`, `do not remove`, `too risky`, `fine for now` and long justifications are not keep reasons by themselves: read the nearby code and trace the named symbol (`/tstack:how-it-works`, why mode) before deciding.
