import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';

const app = express();
const port = process.env.PORT || 3001;

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const prisma = new PrismaClient();

interface AuthenticatedRequest extends express.Request {
  userId?: string;
}

const authenticateJWT = (
  req: AuthenticatedRequest,
  res: express.Response,
  next: express.NextFunction
) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ')
    ? authHeader.substring(7)
    : null;

  if (!token) {
    return res.status(401).json({
      data: null,
      message: 'Access token required',
    });
  }

  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    return res.status(500).json({
      data: null,
      message: 'JWT secret not configured',
    });
  }

  try {
    const decoded = jwt.verify(token, jwtSecret) as { userId: string };
    req.userId = decoded.userId;
    next();
  } catch (error) {
    return res.status(401).json({
      data: null,
      message: 'Invalid token',
    });
  }
};

const updateSettingsSchema = z.object({
  theme: z.enum(['system', 'light', 'dark']).optional(),
  language: z.enum(['ja', 'en']).optional(),
  taskInsertPosition: z.enum(['top', 'bottom']).optional(),
  autoSort: z.boolean().optional(),
}).strict();

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

  async updateUserSettings(userId: string, updateData: z.infer<typeof updateSettingsSchema>) {
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
    const settings = await settingsService.updateUserSettings(userId, validatedData);

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

apiRouter.get('/settings', authenticateJWT, settingsController.getSettings);
apiRouter.put('/settings', authenticateJWT, settingsController.updateSettings);

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
