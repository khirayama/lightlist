import express from 'express';
import { z } from 'zod';
import { prisma, AuthenticatedRequest } from '../index';

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
    let settings = await prisma.settings.findUnique({
      where: { userId },
    });

    if (!settings) {
      settings = await prisma.settings.create({
        data: {
          userId,
          theme: 'light',
          language: 'ja',
          taskInsertPosition: 'top',
          autoSort: false,
        },
      });
    }

    return settings;
  },

  async updateUserSettings(
    userId: string,
    updateData: z.infer<typeof updateSettingsSchema>
  ) {
    return await prisma.settings.upsert({
      where: { userId },
      update: updateData,
      create: {
        userId,
        theme: updateData.theme || 'light',
        language: updateData.language || 'ja',
        taskInsertPosition: updateData.taskInsertPosition || 'top',
        autoSort: updateData.autoSort || false,
      },
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
