import { PrismaClient } from "@prisma/client";
import type { NextApiRequest } from "next";

import { createSupabaseClient } from "common/supabase";

const supabase = createSupabaseClient();

export function createPrismaClient() {
  if (process.env.NODE_ENV !== "production") {
    if (!globalThis.prisma) {
      globalThis.prisma = new PrismaClient();
    }
    return globalThis.prisma;
  }
  return new PrismaClient();
}

export function exclude<T, Key extends keyof T>(
  obj: T,
  keys: Key[],
): Omit<T, Key> {
  return obj
    ? (Object.fromEntries(
        Object.entries(obj).filter(([key]: any) => !keys.includes(key)),
      ) as Omit<T, Key>)
    : obj;
}

export async function auth(req: NextApiRequest) {
  const authorization = req.headers["authorization"];

  if (!authorization) {
    return {
      user: null,
      errorMessage: "Authorization header is required.",
    };
  }

  const accessToken = authorization.split(" ")[1];
  const {
    data: { user },
    error: err,
  } = await supabase.auth.getUser(accessToken);

  if (err) {
    return {
      user: null,
      errorMessage: err.message,
    };
  }

  return {
    user,
    errorMessage: "",
  };
}
