import express from 'express';
import { z } from 'zod';
import { LoroDoc } from 'loro-crdt';
import { randomBytes } from 'crypto';
import { prisma, supabase, AuthenticatedRequest } from '../index';

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

const authService = {
  async register(
    email: string,
    password: string,
    language: 'ja' | 'en' = 'ja'
  ) {
    const {
      data: { user },
      error,
    } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (error || !user) {
      throw new Error(error?.message || 'Failed to create user');
    }

    const taskListName = language === 'ja' ? '📝個人' : '📝Personal';
    const taskListId = randomBytes(16).toString('hex');

    const orderDoc = new LoroDoc();
    const orderList = orderDoc.getMovableList('order');
    orderList.push(taskListId);

    const taskListDoc = new LoroDoc();
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
          doc: Buffer.from(orderDoc.export({ mode: 'snapshot' })),
          order: [taskListId],
        },
      }),
      prisma.taskListDoc.create({
        data: {
          id: taskListId,
          doc: Buffer.from(taskListDoc.export({ mode: 'snapshot' })),
          name: taskListName,
          background: '',
          tasks: [],
          history: [],
        },
      }),
    ]);

    const {
      data: { session },
    } = await supabase.auth.signInWithPassword({ email, password });

    return {
      user: {
        id: user.id,
        email: user.email!,
      },
      session,
    };
  },

  async login(email: string, password: string) {
    const {
      data: { session, user },
      error,
    } = await supabase.auth.signInWithPassword({ email, password });

    if (error || !session || !user) {
      throw new Error('Invalid credentials');
    }

    return {
      user: {
        id: user.id,
        email: user.email!,
      },
      session,
    };
  },

  async logout(token: string) {
    await supabase.auth.admin.signOut(token);
  },

  async forgotPassword(email: string) {
    await supabase.auth.resetPasswordForEmail(email);
  },

  async resetPassword(token: string, newPassword: string) {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error || !user) {
      throw new Error('Invalid token');
    }

    const { error: updateError } = await supabase.auth.admin.updateUserById(
      user.id,
      { password: newPassword }
    );

    if (updateError) {
      throw new Error('Failed to reset password');
    }
  },

  async deleteAccount(userId: string) {
    await prisma.$transaction(async tx => {
      const orderDoc = await tx.taskListDocOrderDoc.findUnique({
        where: { userId },
      });

      if (orderDoc) {
        await tx.taskListDoc.deleteMany({
          where: { id: { in: orderDoc.order } },
        });

        await tx.taskListDocOrderDoc.delete({
          where: { userId },
        });
      }

      await tx.settings.delete({
        where: { userId },
      });
    });

    await supabase.auth.admin.deleteUser(userId);
  },

  async refreshToken(refreshToken: string) {
    const {
      data: { session, user },
      error,
    } = await supabase.auth.refreshSession({ refresh_token: refreshToken });

    if (error || !session || !user) {
      throw new Error('Invalid refresh token');
    }

    return {
      user: {
        id: user.id,
        email: user.email!,
      },
      session,
    };
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
