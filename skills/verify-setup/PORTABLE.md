# Portable checks

The generated script must pass on another machine, in another system language and on Windows.

- Never parse localized tool output. German Windows `netstat` prints `ABHÖREN`, not `LISTENING`. Probe the real thing instead: open the port, send the request, read the exit code.
- Which `bash` runs: on Windows, `bash` on PATH can be WSL's `System32\bash.exe`. Call Git bash by its path or run the script from Git bash.
- npm `.cmd` shims (`claude`, `pnpm`, `npx`) need a shell to start on Windows.
- Killing the shell leaves its children alive. Kill the tree you started: `taskkill /PID <pid> /T /F`.
- `core.autocrlf` turns fixtures and specs into CRLF. Match `\r?\n`.
- Paths can contain spaces. Quote them, or pass them relative to the working directory.

Record in the generated skill's Gotchas which of these the script relies on.
