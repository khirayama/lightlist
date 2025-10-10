import express from 'express';
import { z } from 'zod';
import { CrdtArray } from '@lightlist/lib';
import { randomBytes, randomUUID, createHash, createHmac } from 'crypto';
// lightweight JWT (HS256) without external deps
const jwt = {
  sign(
    payload: Record<string, unknown>,
    secret: string,
    opts: { expiresIn: string; algorithm: 'HS256' }
  ) {
    const header = { alg: 'HS256', typ: 'JWT' };
    const exp =
      Math.floor(Date.now() / 1000) +
      (opts.expiresIn === '1h' ? 3600 : 7 * 24 * 3600);
    const body = { ...payload, exp };
    const enc = (o: any) =>
      Buffer.from(JSON.stringify(o)).toString('base64url');
    const data = `${enc(header)}.${enc(body)}`;
    const sig = createHmac('sha256', secret).update(data).digest('base64url');
    return `${data}.${sig}`;
  },
};
import { prisma, AuthenticatedRequest } from '../index';

import { TaskListDocument } from '../services/tasklistdocument';

const registerSchema = z
  .object({
    email: z.string().email(),
    password: z.string().min(8),
    language: z.enum(['ja', 'en']).optional(),
  })
  .strict();

const loginSchema = z
  .object({
    email: z.string().email(),
    password: z.string(),
  })
  .strict();

const forgotPasswordSchema = z
  .object({
    email: z.string().email(),
  })
  .strict();

const resetPasswordSchema = z
  .object({
    token: z.string(),
    password: z.string().min(8),
  })
  .strict();

const refreshTokenSchema = z
  .object({
    refreshToken: z.string(),
  })
  .strict();

type AuthUser = { id: string; email: string; passwordHash: string };
type AuthSession = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
};
type AuthResult = { user: { id: string; email: string }; session: AuthSession };

const authService = {
  async register(
    email: string,
    password: string,
    language: 'ja' | 'en' = 'ja'
  ) {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing)
      throw Object.assign(new Error('User already exists'), { status: 409 });

    const user = await prisma.user.create({ data: { email } });

    const taskListName = language === 'ja' ? '📝個人' : '📝Personal';
    const taskListId = randomBytes(16).toString('hex');

    const passHash = createHash('sha256').update(password).digest('hex');
    await prisma.account.create({
      data: {
        userId: user.id,
        providerId: 'credentials',
        accountId: email,
        password: passHash,
      },
    });

    const orderDoc = new CrdtArray<string>({ actorId: user.id });
    orderDoc.insert(0, taskListId);

    const taskListDoc = new TaskListDocument(user.id);
    const root = taskListDoc.getMap('root');
    root.set('name', taskListName);
    root.set('background', '');
    taskListDoc.getMovableList('tasks');
    taskListDoc.getMovableList('history');

    await prisma.$transaction([
      prisma.settings.create({
        data: {
          userId: user.id,
          theme: 'light',
          language,
          taskInsertPosition: 'top',
          autoSort: false,
        },
      }),
      prisma.taskListDocOrderDoc.create({
        data: {
          userId: user.id,
          doc: Buffer.from(JSON.stringify(orderDoc.toSnapshot())),
          order: [taskListId],
        },
      }),
      prisma.taskListDoc.create({
        data: {
          id: taskListId,
          doc: Buffer.from(taskListDoc.export()),
          name: root.get('name') as string,
          background: (root.get('background') as string) || '',
          tasks: taskListDoc.getMovableList('tasks').toArray() as any,
          history: [],
        },
      }),
    ]);

    const secret =
      (process.env.BETTER_AUTH_SECRET as string) ||
      'dev-secret-change-me-at-prod';
    const access = jwt.sign({ sub: user.id }, secret, {
      algorithm: 'HS256',
      expiresIn: '1h',
    });
    const refresh = jwt.sign({ sub: user.id, typ: 'refresh' }, secret, {
      algorithm: 'HS256',
      expiresIn: '7d',
    });

    return {
      user: { id: user.id, email },
      session: {
        access_token: access,
        refresh_token: refresh,
        expires_in: 3600,
      },
    } as any;
  },
  async login(email: string, password: string) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw Object.assign(new Error('Invalid credentials'), { status: 401 });
    }
    const account = await prisma.account.findFirst({
      where: { userId: user.id, providerId: 'credentials' },
    });
    const passHash = createHash('sha256').update(password).digest('hex');
    if (!account || account.password !== passHash) {
      throw Object.assign(new Error('Invalid credentials'), { status: 401 });
    }

    const secret =
      (process.env.BETTER_AUTH_SECRET as string) ||
      'dev-secret-change-me-at-prod';
    const access = jwt.sign({ sub: user.id }, secret, {
      algorithm: 'HS256',
      expiresIn: '1h',
    });
    const refresh = jwt.sign({ sub: user.id, typ: 'refresh' }, secret, {
      algorithm: 'HS256',
      expiresIn: '7d',
    });

    return {
      user: { id: user.id, email: user.email },
      session: {
        access_token: access,
        refresh_token: refresh,
        expires_in: 3600,
      },
    } as any;
  },
  async logout(_token: string) {},
  async forgotPassword(_email: string) {},
  async resetPassword(_token: string, _newPassword: string) {},
  async deleteAccount(userId: string) {
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
      await tx.user.delete({ where: { id: userId } }).catch(() => {});
    });
  },
  async refreshToken(refreshToken: string) {
    const secret =
      (process.env.BETTER_AUTH_SECRET as string) ||
      'dev-secret-change-me-at-prod';
    const parts = refreshToken.split('.');
    if (parts.length !== 3)
      throw Object.assign(new Error('Invalid token'), { status: 401 });
    const [h, p, s] = parts;
    const expected = createHmac('sha256', secret)
      .update(`${h}.${p}`)
      .digest('base64url');
    if (expected !== s)
      throw Object.assign(new Error('Invalid token'), { status: 401 });
    const payload = JSON.parse(Buffer.from(p, 'base64url').toString());
    const now = Math.floor(Date.now() / 1000);
    if (!payload?.sub || payload.exp < now || payload.typ !== 'refresh') {
      throw Object.assign(new Error('Invalid token'), { status: 401 });
    }
    const user = await prisma.user.findUnique({
      where: { id: payload.sub as string },
    });
    if (!user) throw Object.assign(new Error('Invalid token'), { status: 401 });

    const access = jwt.sign({ sub: user.id }, secret, {
      algorithm: 'HS256',
      expiresIn: '1h',
    });
    const newRefresh = jwt.sign({ sub: user.id, typ: 'refresh' }, secret, {
      algorithm: 'HS256',
      expiresIn: '7d',
    });

    return {
      user: { id: user.id, email: user.email },
      session: {
        access_token: access,
        refresh_token: newRefresh,
        expires_in: 3600,
      },
    } as any;
  },
};

export const authController = {
  async register(req: express.Request, res: express.Response) {
    const { email, password, language } = registerSchema.parse(req.body);
    const result = await authService.register(email, password, language);

    res.status(201).json({
      data: {
        user: result.user,
        accessToken: result.session?.access_token,
        refreshToken: result.session?.refresh_token,
        expiresIn: result.session?.expires_in,
      },
      message: 'User registered successfully',
    });
  },

  async login(req: express.Request, res: express.Response) {
    const { email, password } = loginSchema.parse(req.body);
    const result = await authService.login(email, password);

    res.json({
      data: {
        user: result.user,
        accessToken: result.session.access_token,
        refreshToken: result.session.refresh_token,
        expiresIn: result.session.expires_in,
      },
      message: 'Login successful',
    });
  },

  async logout(req: AuthenticatedRequest, res: express.Response) {
    const authHeader = req.headers.authorization;
    const token = authHeader?.substring(7) || '';
    await authService.logout(token);

    res.json({
      data: null,
      message: 'Logout successful',
    });
  },

  async forgotPassword(req: express.Request, res: express.Response) {
    const { email } = forgotPasswordSchema.parse(req.body);
    await authService.forgotPassword(email);

    res.json({
      data: null,
      message: 'Password reset email sent',
    });
  },

  async resetPassword(req: express.Request, res: express.Response) {
    const { token, password } = resetPasswordSchema.parse(req.body);
    await authService.resetPassword(token, password);

    res.json({
      data: null,
      message: 'Password reset successful',
    });
  },

  async deleteAccount(req: AuthenticatedRequest, res: express.Response) {
    const userId = req.userId!;
    await authService.deleteAccount(userId);

    res.json({
      data: null,
      message: 'Account deleted successfully',
    });
  },

  async refreshToken(req: express.Request, res: express.Response) {
    const { refreshToken } = refreshTokenSchema.parse(req.body);
    const result = await authService.refreshToken(refreshToken);

    res.json({
      data: {
        user: result.user,
        accessToken: result.session.access_token,
        refreshToken: result.session.refresh_token,
        expiresIn: result.session.expires_in,
      },
      message: 'Token refreshed successfully',
    });
  },
};
