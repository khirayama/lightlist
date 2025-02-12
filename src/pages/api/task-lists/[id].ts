import type { NextApiRequest, NextApiResponse } from "next";
import type { TaskList as TaskListType } from "@prisma/client";
import * as Y from "yjs";

import { createPrismaClient, exclude, auth } from "common/apiHelper";

const prisma = createPrismaClient();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const taskListId = req.query.id as string;
  const unsafeKeys: (keyof TaskListType)[] = ["id"];
  const shareCode = req.body?.shareCode;
  delete req.body?.shareCode;

  const { errorMessage } = await auth(req);
  if (errorMessage) {
    const sc = await prisma.shareCode.findFirst({
      where: {
        taskListId,
      },
    });
    if (shareCode !== sc.code) {
      return res.status(401).json({ error: errorMessage });
    }
  }

  if (req.method === "PUT" || req.method === "PATCH") {
    let taskList = await prisma.taskList.findUnique({
      where: {
        id: taskListId,
      },
    });
    const doc = new Y.Doc();
    if (taskList?.update) {
      Y.applyUpdate(doc, taskList.update);
    }

    const newTaskList = req.body as Partial<TaskListType>;
    if (newTaskList.update) {
      const u = Uint8Array.from(Object.values(newTaskList.update));
      if (u.length) {
        Y.applyUpdate(doc, u);
      }
    }

    taskList = await prisma.taskList.update({
      where: {
        id: taskListId,
      },
      data: exclude(
        {
          ...doc.getMap(taskListId).toJSON(),
          update: Y.encodeStateAsUpdate(doc),
        } as TaskListType,
        unsafeKeys,
      ),
    });
    return res.json({ taskList });
  }

  if (req.method === "DELETE") {
    const apps = await prisma.app.findMany({
      where: {
        taskListIds: {
          has: taskListId,
        },
      },
    });
    if (apps.length === 1) {
      await prisma.$transaction([
        prisma.shareCode.deleteMany({
          where: {
            taskListId,
          },
        }),
        prisma.taskList.delete({
          where: {
            id: taskListId,
          },
        }),
      ]);
    }
    return res.status(204).end();
  }
}
