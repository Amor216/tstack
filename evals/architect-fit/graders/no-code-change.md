---
type: regex
target: trace
pattern: '"file_path"\s*:\s*"[^"]*todo[\/]+(store|cli)\.py"[^}]*"(old_string|content)"'
match: not_contains
---
