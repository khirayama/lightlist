import express from 'express';

import { prisma } from '../lib/prisma';

export const systemController = {
  async health(_: express.Request, res: express.Response) {
    let db: 'connected' | 'disconnected' = 'disconnected';
    try {
      await prisma.$queryRaw`SELECT 1`;
      db = 'connected';
    } catch {
      db = 'disconnected';
    }

    const status: 'healthy' | 'unhealthy' = db === 'connected' ? 'healthy' : 'unhealthy';

    const services = {
      auth: 'ok',
      email: process.env.RESEND_API_KEY ? 'configured' : 'not_configured',
      collaborative: 'ok',
    } as const;

    res.status(status === 'healthy' ? 200 : 503).json({
      data: {
        status,
        timestamp: new Date().toISOString(),
        database: db,
        services,
        uptime: Math.round(process.uptime()),
      },
      message: status === 'healthy' ? 'System is healthy' : 'System is not healthy',
    });
  },

  async metrics(_: express.Request, res: express.Response) {
    const now = new Date();
    const [users, sessions, taskLists] = await Promise.all([
      prisma.user.count(),
      prisma.session.count({ where: { expiresAt: { gt: now } } }),
      prisma.taskListDoc.findMany({ select: { tasks: true } }),
    ]);

    const totalTasks = taskLists.reduce((sum, d) => {
      const arr = Array.isArray(d.tasks) ? (d.tasks as unknown[]) : [];
      return sum + arr.length;
    }, 0);

    res.json({
      data: {
        activeUsers: users,
        activeSessions: sessions,
        totalTasks,
        uptime: `${Math.round(process.uptime())}s`,
      },
      message: 'Metrics retrieved successfully',
    });
  },
};
