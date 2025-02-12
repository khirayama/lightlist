import type { NextApiRequest, NextApiResponse } from "next";
import type { Preferences as PreferencesType } from "@prisma/client";

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

  const unsafeKeys: (keyof PreferencesType)[] = ["id", "userId"];

  if (req.method === "GET") {
    const preferences = await prisma.preferences.findUnique({
      where: {
        userId: user.id,
      },
    });
    return res.json({
      preferences: exclude(preferences, unsafeKeys),
    });
  }

  if (req.method === "PUT" || req.method === "PATCH") {
    const preferences = await prisma.preferences.update({
      where: {
        userId: user.id,
      },
      data: exclude(req.body, unsafeKeys),
    });
    return res.json({
      preferences: exclude(preferences, unsafeKeys),
    });
  }
}
