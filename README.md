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
npx npx prisma migrate deploy
npm run dev
```

## Deploy Production

```
npx dotenv -e .env.production npx prisma db push
# Copy email templates to `/dashboard/project/{project_id}/auth/templates`
# Set Custom SMTP with Resend
# https://zenn.dev/daimyo404/articles/3fefe4ef2d9500
```
