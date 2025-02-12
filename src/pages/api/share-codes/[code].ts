import { v4 as uuid } from "uuid";
import type { NextApiRequest, NextApiResponse } from "next";

import { createPrismaClient, auth } from "common/apiHelper";

const prisma = createPrismaClient();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const { errorMessage } = await auth(req);
  if (errorMessage) {
    return res.status(401).json({ error: errorMessage });
  }

  const code = req.query.code as string;

  if (req.method === "PUT" || req.method === "PATCH") {
    const newShareCode = uuid();
    const shareCode = await prisma.shareCode.update({
      where: {
        code,
      },
      data: { code: newShareCode },
    });
    return res.json({ shareCode });
  }
}
