import type { NextApiRequest, NextApiResponse } from "next";

import { prisma } from "libs/pages/api";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === "POST") {
    const newTask = req.body;
    const task = await prisma.task.create({
      data: newTask,
    });
    return res.json({ task });
  }

  if (req.method === "GET") {
    const params = req.query;
    const taskListIds: string[] = Array.isArray(params.taskListIds)
      ? params.taskListIds
      : params.taskListIds
        ? [params.taskListIds]
        : [];
    const taskLists = await prisma.taskList.findMany({
      where: {
        id: { in: taskListIds },
      },
    });
    const taskIds = taskLists.map((taskList) => taskList.taskIds).flat();
    const tasks = await prisma.task.findMany({
      where: {
        id: { in: taskIds },
      },
    });
    return res.json({
      tasks,
    });
  }
}
