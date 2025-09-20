import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

const app = express();
const port = process.env.PORT || 3001;

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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
