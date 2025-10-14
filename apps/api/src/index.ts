import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { ZodError } from 'zod';

import { settingsController } from './controllers/settings';
import { systemController } from './controllers/system';
import { taskListDocsController } from './controllers/tasklistdocs';
import { auth, authenticate, authController } from './lib/auth';
import { toNodeHandler } from 'better-auth/node';

const app = express();
const port = process.env.PORT || 3001;

let corsOptions: cors.CorsOptions = { origin: '*', credentials: false };
const corsOriginRaw = process.env.CORS_ORIGIN?.trim();
if (corsOriginRaw && corsOriginRaw !== '*') {
  const allowlist = corsOriginRaw
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
  if (allowlist.length === 0) {
    throw new Error("CORS_ORIGIN must be '*' or a comma-separated list");
  }
  corsOptions = { origin: allowlist, credentials: true };
}

const limiter = rateLimit({
  windowMs: 60_000,
  max: Number(process.env.API_RATE_LIMIT_MAX || 100),
});

/* eslint-disable @typescript-eslint/no-unused-vars */
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

const apiRouter = express.Router();
// app
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
// auth
apiRouter.delete(
  '/account',
  authenticate,
  asyncHandler(authController.deleteAccount)
);
// system
apiRouter.get('/health', asyncHandler(systemController.health));
apiRouter.get('/metrics', asyncHandler(systemController.metrics));

app.disable('x-powered-by');
app.use(helmet());
app.use(cors(corsOptions));
app.use('/api', limiter);
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.all('/api/auth/*', toNodeHandler(auth));
app.use('/api', apiRouter);
app.use('/api/*', (_, res) => {
  res.status(404).json({ data: null, message: 'Endpoint not found' });
});
app.use(errorHandler);

if (process.env.NODE_ENV !== 'test' && !process.env.VITEST_WORKER_ID) {
  app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
  });
}

export default app;
