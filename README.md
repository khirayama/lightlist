## Set up local env

```
npx supabase start
npx supabase status
# Copy .env.example to .env.development and set NEXT_PUBLIC_SUPABASE_ANON_KEY
npx dotenv -e .env.development -- npx prisma migrate dev
npx supabase migration up
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
```
