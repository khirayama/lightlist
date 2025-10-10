import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { PrismaClient } from '@prisma/client';
import { createHmac } from 'crypto';
import { ZodError } from 'zod';
import { authController } from './controllers/auth';
import { settingsController } from './controllers/settings';
import { systemController } from './controllers/system';
import { taskListDocsController } from './controllers/tasklistdocs';

const app = express();
const port = process.env.PORT || 3001;

app.use(helmet());
app.use(cors());
const limiter = rateLimit({ windowMs: 60_000, max: Number(process.env.API_RATE_LIMIT_MAX || 100) });
app.use(limiter);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

export const prisma = new PrismaClient();

export interface AuthenticatedRequest extends express.Request {
  userId?: string;
}

const authenticateJwt = async (
  req: AuthenticatedRequest,
  res: express.Response,
  next: express.NextFunction
) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return res.status(401).json({ data: null, message: 'Access token required' });
  try {
    const secret = (process.env.BETTER_AUTH_SECRET as string | undefined) || 'dev-secret-change-me-at-prod';
    if (!secret) return res.status(500).json({ data: null, message: 'Server misconfigured' });
    const [h, p, s] = token.split('.');
    if (!h || !p || !s) return res.status(401).json({ data: null, message: 'Invalid token' });
    const expected = createHmac('sha256', secret).update(`${h}.${p}`).digest('base64url');
    if (expected !== s) return res.status(401).json({ data: null, message: 'Invalid token' });
    const payload = JSON.parse(Buffer.from(p, 'base64url').toString());
    if (!payload?.sub) return res.status(401).json({ data: null, message: 'Invalid token' });
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return res.status(401).json({ data: null, message: 'Invalid token' });
    req.userId = payload.sub as string;
    return next();
  } catch {
    return res.status(401).json({ data: null, message: 'Invalid token' });
  }
};

const asyncHandler =
  (
    fn: (
      req: express.Request,
      res: express.Response,
      next: express.NextFunction
    ) => Promise<any> | void
  ) =>
  (req: express.Request, res: express.Response, next: express.NextFunction) =>
    Promise.resolve(fn(req, res, next)).catch(next);

const apiRouter = express.Router();

apiRouter.get('/health', asyncHandler(systemController.health));
apiRouter.get('/metrics', asyncHandler(systemController.metrics));

apiRouter.post('/auth/register', asyncHandler(authController.register));
apiRouter.post('/auth/login', asyncHandler(authController.login));
apiRouter.post(
  '/auth/logout',
  authenticateJwt,
  asyncHandler(authController.logout)
);
apiRouter.post('/auth/refresh', asyncHandler(authController.refreshToken));
apiRouter.post(
  '/auth/forgot-password',
  asyncHandler(authController.forgotPassword)
);
apiRouter.post(
  '/auth/reset-password',
  asyncHandler(authController.resetPassword)
);
apiRouter.delete(
  '/auth/account',
  authenticateJwt,
  authController.deleteAccount
);

apiRouter.get(
  '/settings',
  authenticateJwt,
  asyncHandler(settingsController.getSettings)
);
apiRouter.put(
  '/settings',
  authenticateJwt,
  asyncHandler(settingsController.updateSettings)
);

apiRouter.post(
  '/tasklistdocs',
  authenticateJwt,
  asyncHandler(taskListDocsController.createTaskListDoc)
);
apiRouter.get(
  '/tasklistdocs',
  authenticateJwt,
  asyncHandler(taskListDocsController.getTaskListDocs)
);
apiRouter.put(
  '/tasklistdocs/order',
  authenticateJwt,
  asyncHandler(taskListDocsController.updateTaskListDocOrder)
);
apiRouter.put(
  '/tasklistdocs/:taskListId',
  authenticateJwt,
  asyncHandler(taskListDocsController.updateTaskListDoc)
);
apiRouter.delete(
  '/tasklistdocs/:taskListId',
  authenticateJwt,
  asyncHandler(taskListDocsController.deleteTaskListDoc)
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
  ) => {
    console.error('Error:', err);

    if (err instanceof ZodError) {
      return res.status(422).json({
        data: null,
        message: 'Validation error',
        issues:
          err.errors?.map(e => ({ path: e.path, message: e.message })) ?? [],
      });
    }

    const status = err.status || err.statusCode || 500;
    const message =
      status === 500
        ? 'Internal server error'
        : err.message || 'Something went wrong';

    res.status(status).json({
      data: null,
      message,
    });
  }
);

if (process.env.NODE_ENV !== 'test') {
  app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
  });
}

export default app;