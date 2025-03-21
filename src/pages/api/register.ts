import type { NextApiRequest, NextApiResponse } from "next";
import type { App as AppType, TaskList as TaskListType } from "@prisma/client";
import * as Y from "yjs";
import { v4 as uuid } from "uuid";

import { createPrismaClient, exclude, auth } from "common/apiHelper";

const prisma = createPrismaClient();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const { user, errorMessage } = await auth(req);
  if (errorMessage) {
    return res.status(401).json({ error: errorMessage });
  }

  if (req.method === "POST") {
    const existedApp = await prisma.app.findUnique({
      where: {
        userId: user.id,
      },
    });

    if (existedApp) {
      return res.json({ message: "User already exists" });
    }
    const lang = (req.body.lang || "ja").toUpperCase();

    const appDoc = new Y.Doc();
    const ad = appDoc.getMap("app");
    ad.set("userId", user.id);
    ad.set("taskListIds", new Y.Array());
    ad.set("taskInsertPosition", "TOP");

    const [app, profile, preferences] = await prisma.$transaction([
      prisma.app.create({
        data: {
          ...ad.toJSON(),
          update: Y.encodeStateAsUpdate(appDoc),
        } as AppType,
      }),
      prisma.profile.create({
        data: {
          userId: user.id,
          displayName: user.email.split("@")[0],
        },
      }),
      prisma.preferences.create({
        data: {
          userId: user.id,
          lang,
          theme: "SYSTEM",
        },
      }),
    ]);

    if (!app || !profile || !preferences) {
      return res.status(500).json({ error: "Failed to create user" });
    }

    const id = uuid();
    const taskListDoc = new Y.Doc();
    const td = taskListDoc.getMap(id);
    td.set("id", id);
    td.set("name", `📋 ${lang === "JA" ? "個人" : "PERSONAL"}`);
    const tasks = new Y.Array();
    td.set("tasks", tasks);

    const [taskList, shareCode] = await prisma.$transaction([
      prisma.taskList.create({
        data: {
          ...td.toJSON(),
          update: Y.encodeStateAsUpdate(taskListDoc),
        } as TaskListType,
      }),
      prisma.shareCode.create({
        data: {
          taskListId: id,
        },
      }),
    ]);

    const taskListIds = ad.get("taskListIds") as Y.Array<string>;
    taskListIds.insert(0, [taskList.id]);
    await prisma.app.update({
      where: { userId: user.id },
      data: {
        ...ad.toJSON(),
        update: Y.encodeStateAsUpdate(appDoc),
      },
    });

    return res.json({
      app: exclude(app, ["id", "userId"]),
      profile: exclude(profile, ["id", "userId"]),
      preferences: exclude(preferences, ["id", "userId"]),
      taskList: {
        ...taskList,
        shareCode: shareCode.code,
      },
    });
  }
}
