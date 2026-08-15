import "server-only";

import { cookies } from "next/headers";

export const MEMBER_COOKIE = "family_member_id";

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

export async function readMemberIdCookie(): Promise<string | null> {
  const store = await cookies();
  return store.get(MEMBER_COOKIE)?.value ?? null;
}

export async function writeMemberIdCookie(memberId: string): Promise<void> {
  const store = await cookies();
  store.set(MEMBER_COOKIE, memberId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ONE_YEAR_SECONDS,
  });
}

export async function clearMemberIdCookie(): Promise<void> {
  const store = await cookies();
  store.delete(MEMBER_COOKIE);
}
