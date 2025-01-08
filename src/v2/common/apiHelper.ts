import { createClient } from "@supabase/supabase-js";
import type { NextApiRequest } from "next";
import { PrismaClient } from "@prisma/client";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

export const prisma = new PrismaClient();

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
