Code style & conventions:

- TypeScript strict; define concrete types; avoid any/unknown.
- TDD (t-wada style): write failing test, minimal implementation, refactor; small incremental changes.
- Rob Pike style: keep code simple, clear, consistent, readable, maintainable; avoid redundancy.
- i18next for all user-facing text; support ja/en; default ja; theme support (system/light/dark).
- Prefer no additional libraries; implement needed functionality in-house except widely trusted utilities.
- Do not split files unless same role/behavior; keep structure stable.
- Update docs under docs/ alongside code changes; ensure consistency.
- Prettier formatting at end of work; run repo builds for apps and packages to verify.
- Commit messages: concise Japanese without conventional commit prefix; describe what and why, and what was instructed.
- Do not commit without explicit instruction.
