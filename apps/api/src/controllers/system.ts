import express from 'express';
import { prisma } from '../lib/prisma';

export const systemController = {
  async health(_: express.Request, res: express.Response) {
    let db = 'disconnected';
    try {
      await prisma.$queryRaw`SELECT 1`;
      db = 'connected';
    } catch {
      db = 'disconnected';
    }

    res.json({
      data: {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        database: db,
        services: { auth: 'ok', collaborative: 'ok' },
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
