import type { NextApiRequest, NextApiResponse } from "next";
import type { TaskList as TaskListType } from "@prisma/client";
import * as Y from "yjs";

import { createPrismaClient, exclude, auth } from "common/apiHelper";

const prisma = createPrismaClient();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const { user, errorMessage } = await auth(req);

  if (req.method === "POST") {
    if (errorMessage) {
      return res.status(401).json({ error: errorMessage });
    }

    const newTaskList = req.body;
    const taskListDoc = new Y.Doc();
    const td = taskListDoc.getMap(newTaskList.id);
    Y.applyUpdate(
      taskListDoc,
      Uint8Array.from(Object.values(newTaskList.update)),
    );
    const [taskList, shareCode] = await prisma.$transaction([
      prisma.taskList.create({
        data: {
          ...td.toJSON(),
          update: Y.encodeStateAsUpdate(taskListDoc),
        } as TaskListType,
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
            id: { in: app.taskListIds || [] },
          },
        }),
        prisma.shareCode.findMany({
          where: {
            taskListId: { in: app.taskListIds || [] },
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
