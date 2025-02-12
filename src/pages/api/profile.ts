import type { NextApiRequest, NextApiResponse } from "next";
import type { Profile as ProfileType } from "@prisma/client";

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

  const unsafeKeys: (keyof ProfileType)[] = ["id", "userId"];

  if (req.method === "GET") {
    const profile = await prisma.profile.findUnique({
      where: {
        userId: user.id,
      },
    });
    return res.json({
      profile: {
        ...exclude(profile, unsafeKeys),
        email: user.email,
      },
    });
  }

  if (req.method === "PUT" || req.method === "PATCH") {
    const profile = await prisma.profile.update({
      where: {
        userId: user.id,
      },
      data: exclude(req.body, unsafeKeys),
    });
    return res.json({
      profile: {
        ...exclude(profile, unsafeKeys),
        email: user.email,
      },
    });
  }
}
