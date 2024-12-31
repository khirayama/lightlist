## Set up local env

```
npx supabase start
npx supabase status
# Copy .env.example to .env and set NEXT_PUBLIC_SUPABASE_ANON_KEY
# .env is for development, .env.production is for production
npx prisma migrate deploy
```

## Dev

```
npx supabase start
npm run dev

npx supabase stop
```

## Reset

```
npx supabase db reset
npm run dev
npx npx prisma migrate deploy
```
