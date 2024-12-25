import type { NextApiRequest, NextApiResponse } from "next";
import type { App as AppType } from "@prisma/client";

import { prisma, exclude, auth } from "libs/apiHelper";

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
        update: {},
        ...exclude(app, unsafeKeys),
      },
    });
  }
  if (req.method === "PATCH") {
    const app = await prisma.app.update({
      where: {
        userId: user.id,
      },
      data: exclude(req.body, unsafeKeys),
    });
    return res.json({
      app: exclude(app, unsafeKeys),
    });
  }
}
