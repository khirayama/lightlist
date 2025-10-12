import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import type { AuthenticatedRequest } from './types/http';
import { getSessionUserId } from './auth';
import { ZodError } from 'zod';
import { authController } from './controllers/auth';
import { settingsController } from './controllers/settings';
import { systemController } from './controllers/system';
import { taskListDocsController } from './controllers/tasklistdocs';

const app = express();
const port = process.env.PORT || 3001;

app.use(helmet());
const allowlist = process.env.CORS_ORIGIN?.split(',')
  .map(s => s.trim())
  .filter(Boolean);
if (!allowlist || allowlist.length === 0) {
  throw new Error('CORS_ORIGIN must be set (comma-separated)');
}
app.use(cors({ origin: allowlist, credentials: true }));
const limiter = rateLimit({
  windowMs: 60_000,
  max: Number(process.env.API_RATE_LIMIT_MAX || 100),
});
app.use(limiter);

import { betterAuthHandler } from './auth';
app.all('/api/auth/*', betterAuthHandler());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const authenticate = async (
  req: AuthenticatedRequest,
  res: express.Response,
  next: express.NextFunction
) => {
  const userId = await getSessionUserId(req);
  if (!userId)
    return res.status(401).json({ data: null, message: 'Unauthorized' });
  req.userId = userId;
  return next();
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
    Promise.resolve()
      .then(() => fn(req, res, next))
      .catch(next);

// cookie または Bearer のどちらでも可

const apiRouter = express.Router();

apiRouter.get('/health', asyncHandler(systemController.health));
apiRouter.get('/metrics', asyncHandler(systemController.metrics));

apiRouter.get(
  '/settings',
  authenticate,
  asyncHandler(settingsController.getSettings)
);
apiRouter.put(
  '/settings',
  authenticate,
  asyncHandler(settingsController.updateSettings)
);

apiRouter.post(
  '/tasklistdocs',
  authenticate,
  asyncHandler(taskListDocsController.createTaskListDoc)
);
apiRouter.get(
  '/tasklistdocs',
  authenticate,
  asyncHandler(taskListDocsController.getTaskListDocs)
);
apiRouter.put(
  '/tasklistdocs/order',
  authenticate,
  asyncHandler(taskListDocsController.updateTaskListDocOrder)
);
apiRouter.put(
  '/tasklistdocs/:taskListId',
  authenticate,
  asyncHandler(taskListDocsController.updateTaskListDoc)
);
apiRouter.delete(
  '/tasklistdocs/:taskListId',
  authenticate,
  asyncHandler(taskListDocsController.deleteTaskListDoc)
);

apiRouter.delete(
  '/account',
  authenticate,
  asyncHandler(authController.deleteAccount)
);

app.use('/api', apiRouter);

app.use('/api/*', (_, res) => {
  res.status(404).json({ data: null, message: 'Endpoint not found' });
});

const errorHandler: express.ErrorRequestHandler = (err, _req, res, _next) => {
  console.error('Error:', (err && (err as any).message) ?? err);

  if (err instanceof ZodError) {
    return res.status(422).json({
      data: null,
      message: 'Validation error',
      issues:
        err.errors?.map(e => ({ path: e.path, message: e.message })) ?? [],
    });
  }

  const status =
    (err && ((err as any).status || (err as any).statusCode)) || 500;
  const message =
    status === 500
      ? 'Internal server error'
      : (err && (err as any).message) || 'Something went wrong';

  res.status(status).json({ data: null, message });
};

app.use(errorHandler);

if (process.env.NODE_ENV !== 'test' && !process.env.VITEST_WORKER_ID) {
  app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
  });
}

export default app;
