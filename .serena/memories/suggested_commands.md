Common commands:

- Install deps: npm install
- Start Supabase local: npx supabase start
- Setup repo: npm run setup
- Dev (all): npm run dev
- Dev API only: npm run dev --filter=@lightlist/api
- Dev Native only: npm run dev --filter=@lightlist/native
- Build all: npm run build
- Test all: npm run test
- Lint & type-check: npm run check
- Clean: npm run clean
- API health check: curl http://localhost:3001/api/health
- Native platform: (cd apps/native && npm run ios|android)
- SDK integration tests (parallelized): (cd packages/sdk && npm run test:integration)
