When finishing a task:
1) Update related docs under docs/ to reflect changes (API, client behavior, config). Keep consistency with implementation.
2) Run formatting (Prettier) on changed files.
3) Build all apps and packages: npm run build. Fix only issues related to the task.
4) Run tests as applicable (unit/integration): npm run test, or specific workspace.
5) For native changes, ensure i18n keys exist and UI adheres to theme and accessibility.
6) Do small, incremental changes; verify at each step.
7) Do not commit unless explicitly instructed; when committing, write concise Japanese message describing what changed and why per instruction.