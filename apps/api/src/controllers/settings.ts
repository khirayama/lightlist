import express from 'express';
import { z } from 'zod';

import { prisma } from '../lib/prisma';
import type { AuthenticatedRequest } from '../types';

const updateSettingsSchema = z
  .object({
    theme: z.enum(['system', 'light', 'dark']).optional(),
    language: z.enum(['ja', 'en']).optional(),
    taskInsertPosition: z.enum(['top', 'bottom']).optional(),
    autoSort: z.boolean().optional(),
  })
  .strict();

const settingsService = {
  async getUserSettings(userId: string) {
    const settings = await prisma.settings.upsert({
      where: { userId },
      update: {},
      create: { userId },
    });
    return settings;
  },

  async updateUserSettings(
    userId: string,
    updateData: z.infer<typeof updateSettingsSchema>
  ) {
    return await prisma.settings.upsert({
      where: { userId },
      update: updateData,
      create: { userId, ...updateData },
    });
  },
};

export const settingsController = {
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
    const settings = await settingsService.updateUserSettings(
      userId,
      validatedData
    );

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
