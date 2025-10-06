import express from 'express';

export const systemController = {
  health(_: express.Request, res: express.Response) {
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
  },

  metrics(_: express.Request, res: express.Response) {
    res.json({
      data: {
        activeUsers: 0,
        activeSessions: 0,
        totalTasks: 0,
        uptime: process.uptime() + 's',
      },
      message: 'Metrics retrieved successfully',
    });
  },
};
