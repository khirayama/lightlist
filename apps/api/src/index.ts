import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';
import { LoroDoc } from 'loro-crdt';
import { randomBytes } from 'crypto';

const app = express();
const port = process.env.PORT || 3001;

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const prisma = new PrismaClient();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Supabase configuration is missing');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface AuthenticatedRequest extends express.Request {
  userId?: string;
}

const authenticateSupabase = async (
  req: AuthenticatedRequest,
  res: express.Response,
  next: express.NextFunction
) => {
  const authHeader = req.headers.authorization;
  const token =
    authHeader && authHeader.startsWith('Bearer ')
      ? authHeader.substring(7)
      : null;

  if (!token) {
    return res.status(401).json({
      data: null,
      message: 'Access token required',
    });
  }

  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({
        data: null,
        message: 'Invalid token',
      });
    }

    req.userId = user.id;
    next();
  } catch (error) {
    return res.status(401).json({
      data: null,
      message: 'Authentication failed',
    });
  }
};

const updateSettingsSchema = z
  .object({
    theme: z.enum(['system', 'light', 'dark']).optional(),
    language: z.enum(['ja', 'en']).optional(),
    taskInsertPosition: z.enum(['top', 'bottom']).optional(),
    autoSort: z.boolean().optional(),
  })
  .strict();

const settingsService = {
  async getUserSettings(userId: string) {
    let settings = await prisma.settings.findUnique({
      where: { userId },
    });

    if (!settings) {
      settings = await prisma.settings.create({
        data: {
          userId,
          theme: 'light',
          language: 'ja',
          taskInsertPosition: 'top',
          autoSort: false,
        },
      });
    }

    return settings;
  },

  async updateUserSettings(
    userId: string,
    updateData: z.infer<typeof updateSettingsSchema>
  ) {
    return await prisma.settings.upsert({
      where: { userId },
      update: updateData,
      create: {
        userId,
        theme: updateData.theme || 'light',
        language: updateData.language || 'ja',
        taskInsertPosition: updateData.taskInsertPosition || 'top',
        autoSort: updateData.autoSort || false,
      },
    });
  },
};

const settingsController = {
  async getSettings(req: AuthenticatedRequest, res: express.Response) {
    const userId = req.userId!;
    const settings = await settingsService.getUserSettings(userId);

    res.json({
      data: {
        id: settings.id,
        theme: settings.theme,
        language: settings.language,
        taskInsertPosition: settings.taskInsertPosition,
        autoSort: settings.autoSort,
      },
      message: 'Settings retrieved successfully',
    });
  },

  async updateSettings(req: AuthenticatedRequest, res: express.Response) {
    const userId = req.userId!;
    const validatedData = updateSettingsSchema.parse(req.body);
    const settings = await settingsService.updateUserSettings(
      userId,
      validatedData
    );

    res.json({
      data: {
        id: settings.id,
        theme: settings.theme,
        language: settings.language,
        taskInsertPosition: settings.taskInsertPosition,
        autoSort: settings.autoSort,
      },
      message: 'Settings updated successfully',
    });
  },
};

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
};

const authController = {
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
};

const apiRouter = express.Router();

apiRouter.get('/health', (_, res) => {
  res.json({
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: 'connected',
      services: {
        auth: 'ok',
        collaborative: 'ok',
      },
    },
    message: 'System is healthy',
  });
});

apiRouter.get('/metrics', (_, res) => {
  res.json({
    data: {
      activeUsers: 0,
      activeSessions: 0,
      totalTasks: 0,
      uptime: process.uptime() + 's',
    },
    message: 'Metrics retrieved successfully',
  });
});

apiRouter.post('/auth/register', authController.register);
apiRouter.post('/auth/login', authController.login);
apiRouter.post('/auth/logout', authenticateSupabase, authController.logout);
apiRouter.post('/auth/forgot-password', authController.forgotPassword);
apiRouter.post('/auth/reset-password', authController.resetPassword);
apiRouter.delete(
  '/auth/account',
  authenticateSupabase,
  authController.deleteAccount
);

apiRouter.get(
  '/settings',
  authenticateSupabase,
  settingsController.getSettings
);
apiRouter.put(
  '/settings',
  authenticateSupabase,
  settingsController.updateSettings
);

app.use('/api', apiRouter);

app.use('/api/*', (_, res) => {
  res.status(404).json({
    data: null,
    message: 'Endpoint not found',
  });
});

app.use(
  (
    err: any,
    _: express.Request,
    res: express.Response
    // next: express.NextFunction
  ) => {
    console.error('Error:', err);

    const status = err.status || err.statusCode || 500;
    const message =
      status === 500
        ? 'Internal server error'
        : err.message || 'Something went wrong';

    res.status(status).json({
      data: null,
      message: message,
    });
  }
);

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
