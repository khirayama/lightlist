import type { NextApiRequest, NextApiResponse } from "next";

import { createPrismaClient, auth } from "common/apiHelper";
import { createSupabaseClient } from "common/supabase";

const prisma = createPrismaClient();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const { user, errorMessage } = await auth(req);
  if (errorMessage) {
    return res.status(401).json({ error: errorMessage });
  }

  if (req.method === "DELETE") {
    const supabase = createSupabaseClient();
    const app = await prisma.app.findFirst({
      where: {
        userId: user.id,
      },
    });
    supabase.auth.admin.deleteUser(user.id).then(() => {
      Promise.all([
        prisma.app.deleteMany({
          where: {
            userId: user.id,
          },
        }),
        prisma.profile.deleteMany({
          where: {
            userId: user.id,
          },
        }),
        prisma.preferences.deleteMany({
          where: {
            userId: user.id,
          },
        }),
      ]).then(() => {
        app.taskListIds.forEach(async (taskListId: string) => {
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
        });
        res.status(200).json({ message: "User deleted successfully" });
      });
    });
  }
}
