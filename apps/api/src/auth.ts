import { betterAuth } from 'better-auth';
import { prisma } from './lib/prisma';
import type express from 'express';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { fromNodeHeaders, toNodeHandler } from 'better-auth/node';

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: 'postgresql' }),
  emailAndPassword: { enabled: true },
});

export function betterAuthHandler() {
  return toNodeHandler(auth);
}

export async function getSessionUserId(
  req: express.Request
): Promise<string | null> {
  const session = await auth.api.getSession({
    headers: fromNodeHeaders(req.headers),
  });
  const anySession = session as unknown as { user?: { id?: string } } | null;
  return anySession?.user?.id ?? null;
}
