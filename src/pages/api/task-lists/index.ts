import type { NextApiRequest, NextApiResponse } from "next";

import { prisma, auth } from "libs/apiHelper";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const { user, errorMessage } = await auth(req);

  if (errorMessage) {
    return res.status(401).json({ error: errorMessage });
  }

  if (req.method === "POST") {
    const newTaskList = req.body;
    delete newTaskList.shareCode;
    const [taskList, shareCode] = await prisma.$transaction([
      prisma.taskList.create({
        data: newTaskList,
      }),
      prisma.shareCode.create({
        data: {
          taskListId: newTaskList.id,
        },
      }),
    ]);
    return res.json({
      taskList: {
        ...taskList,
        shareCode: shareCode.code,
      },
    });
  }

  if (req.method === "GET") {
    let taskLists = [];
    let shareCodes = [];

    const params = req.query;

    if (params.shareCodes) {
      const codes: string[] = Array.isArray(params.shareCodes)
        ? params.shareCodes
        : [params.shareCodes];
      shareCodes = await prisma.shareCode.findMany({
        where: {
          code: { in: codes },
        },
      });
      taskLists = await prisma.taskList.findMany({
        where: {
          id: { in: shareCodes.map((shareCode) => shareCode.taskListId) },
        },
      });
    } else {
      if (errorMessage) {
        return res.status(401).json({ error: errorMessage });
      }

      const app = await prisma.app.findUnique({
        where: {
          userId: user.id,
        },
      });
      [taskLists, shareCodes] = await prisma.$transaction([
        prisma.taskList.findMany({
          where: {
            id: { in: app.taskListIds },
          },
        }),
        prisma.shareCode.findMany({
          where: {
            taskListId: { in: app.taskListIds },
          },
        }),
      ]);
    }

    return res.json({
      taskLists: taskLists.map((taskList) => ({
        ...taskList,
        shareCode: shareCodes.find(
          (shareCode) => shareCode.taskListId === taskList.id,
        )?.code,
      })),
    });
  }
}
