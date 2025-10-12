import express from 'express';
import type { AuthenticatedRequest } from '../types/http';
import { prisma } from '../lib/prisma';

export const authController = {
  async deleteAccount(req: AuthenticatedRequest, res: express.Response) {
    const userId = req.userId!;
    await prisma.$transaction(async tx => {
      const orderDoc = await tx.taskListDocOrderDoc.findUnique({
        where: { userId },
      });
      if (orderDoc) {
        await tx.taskListDoc.deleteMany({
          where: { id: { in: orderDoc.order } },
        });
        await tx.taskListDocOrderDoc.delete({ where: { userId } });
      }
      await tx.settings.deleteMany({ where: { userId } });
      await tx.session.deleteMany({ where: { userId } });
      await tx.account.deleteMany({ where: { userId } });
      await tx.user.delete({ where: { id: userId } }).catch(() => {});
    });
    res.json({ data: null, message: 'Account deleted successfully' });
  },
};
