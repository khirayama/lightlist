import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { PrismaClient } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';
import { authController } from './controllers/auth';
import { settingsController } from './controllers/settings';
import { systemController } from './controllers/system';
import { taskListDocsController } from './controllers/tasklistdocs';

const app = express();
const port = process.env.PORT || 3001;

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

export const prisma = new PrismaClient();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Supabase configuration is missing');
}

export const supabase = createClient(supabaseUrl, supabaseServiceKey);

export interface AuthenticatedRequest extends express.Request {
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

const apiRouter = express.Router();

apiRouter.get('/health', systemController.health);
apiRouter.get('/metrics', systemController.metrics);

apiRouter.post('/auth/register', authController.register);
apiRouter.post('/auth/login', authController.login);
apiRouter.post('/auth/logout', authenticateSupabase, authController.logout);
apiRouter.post('/auth/refresh', authController.refreshToken);
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

apiRouter.post(
  '/tasklistdocs',
  authenticateSupabase,
  taskListDocsController.createTaskListDoc
);
apiRouter.get(
  '/tasklistdocs',
  authenticateSupabase,
  taskListDocsController.getTaskListDocs
);
apiRouter.put(
  '/tasklistdocs/order',
  authenticateSupabase,
  taskListDocsController.updateTaskListDocOrder
);
apiRouter.put(
  '/tasklistdocs/:taskListId',
  authenticateSupabase,
  taskListDocsController.updateTaskListDoc
);
apiRouter.delete(
  '/tasklistdocs/:taskListId',
  authenticateSupabase,
  taskListDocsController.deleteTaskListDoc
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

if (process.env.NODE_ENV !== 'test') {
  app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
  });
}

export default app;
