import type { NextApiRequest, NextApiResponse } from "next";
import type { App as AppType } from "@prisma/client";
import * as Y from "yjs";

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

  const unsafeKeys: (keyof AppType)[] = ["id", "userId"];

  if (req.method === "GET") {
    const app = await prisma.app.findUnique({
      where: {
        userId: user.id,
      },
    });
    return res.json({
      app: {
        ...exclude(app, unsafeKeys),
      },
    });
  }

  if (req.method === "PUT" || req.method === "PATCH") {
    let app = await prisma.app.findUnique({
      where: {
        userId: user.id,
      },
    });
    const doc = new Y.Doc();
    if (app.update) {
      Y.applyUpdate(doc, app.update);
    }

    const newApp = req.body as Partial<AppType>;
    if (newApp.update) {
      const u = Uint8Array.from(Object.values(newApp.update));
      if (u.length) {
        Y.applyUpdate(doc, u);
      }
    }

    app = await prisma.app.update({
      where: {
        userId: user.id,
      },
      data: exclude(
        {
          ...doc.getMap("app").toJSON(),
          update: Y.encodeStateAsUpdate(doc),
        } as AppType,
        unsafeKeys,
      ),
    });
    return res.json({
      app: exclude(app, unsafeKeys),
    });
  }
}
