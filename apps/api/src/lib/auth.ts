import express from 'express';
import { betterAuth } from 'better-auth';
import { jwt } from 'better-auth/plugins';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { fromNodeHeaders } from 'better-auth/node';

import { prisma } from '../lib/prisma';
import type { AuthenticatedRequest } from '../types';

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),
  emailAndPassword: {
    enabled: true,
  },
  user: {
    deleteUser: {
      enabled: true,
    },
  },
  plugins: [jwt()],
});

export const authenticate = async (
  req: AuthenticatedRequest,
  res: express.Response,
  next: express.NextFunction
) => {
  try {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(
        req.headers as Record<string, string | string[] | undefined>
      ),
    });
    if (!session) {
      return res.status(401).json({ data: null, message: 'Unauthorized' });
    }
    req.userId = session.user.id;
    return next();
  } catch {
    return res.status(401).json({ data: null, message: 'Unauthorized' });
  }
};

export const authController = {
  async deleteAccount(req: AuthenticatedRequest, res: express.Response) {
    const userId = req.userId!;

    const { password, token, callbackURL } = (req.body ?? {}) as Partial<{
      password: string;
      token: string;
      callbackURL: string;
    }>;

    await auth.api.deleteUser({
      body: {
        ...(typeof password === 'string' ? { password } : {}),
        ...(typeof token === 'string' ? { token } : {}),
        ...(typeof callbackURL === 'string' ? { callbackURL } : {}),
      },
      headers: fromNodeHeaders(
        req.headers as Record<string, string | string[] | undefined>
      ),
    });

    await prisma.$transaction(async tx => {
      const orderDoc = await tx.taskListDocOrderDoc.findUnique({
        where: { userId },
      });
      if (orderDoc) {
        await tx.taskListDoc.deleteMany({
          where: { id: { in: orderDoc.order } },
        });
        await tx.taskListDocOrderDoc.delete({ where: { userId } });
      }
      await tx.settings.deleteMany({ where: { userId } });
    });

    res.json({ data: null, message: 'Account deleted successfully' });
  },
};
