Project: lightlistv4
Purpose: Task management app with API server and React Native mobile client. Uses CRDT for task list data and central API as the single integration point with Supabase.
Tech stack: Turborepo monorepo (Node 18+), apps/api (Node, TypeScript, Express, Prisma, PostgreSQL, Zod, JWT, bcryptjs, rate-limiter, helmet, cors, Vitest, Supertest, Docker Compose), apps/native (React Native, Expo, TypeScript, Expo Router, NativeWind/Tailwind, i18next), packages/lib (custom CRDT implementation), packages/sdk (shared types and API endpoint constants, utilities).
Conventions: TypeScript strict, avoid any/unknown, document changes under docs, i18next for texts, theme (system/light/dark) support. Minimal comments, details in docs. Prettier formatting. TDD (t-wada style). Prefer in-house implementations; keep code simple and readable (Rob Pike). No splitting files unless identical roles.
Structure: apps/api, apps/native, packages/lib, packages/sdk, docs.
Entrypoints: API at http://localhost:3001, Native via Expo. API health: GET /api/health.
New API design (docs/SPEC/API.md): Better Auth handler at /api/ba/_; app API uses Bearer JWT (HS256). Endpoints: /api/auth/_, /api/settings, /api/tasklistdocs, /api/tasklistdocs/:id, /api/tasklistdocs/order, /api/health, /api/metrics. TaskListDoc updates via CRDT operations base64 string.
Current native API client (apps/native/src/lib/api.ts) targets similar endpoints but with "tasklistdocs" and settings; SDK constants show newer naming: TASKLISTS ('/api/tasklists') and APP_SETTINGS ('/api/app').
Potential mismatch: Native api.ts vs SPEC and sdk constants; need alignment plan.
