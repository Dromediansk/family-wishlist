"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getMemberById } from "@/lib/queries";
import { clearMemberIdCookie, writeMemberIdCookie } from "@/lib/session";
import type { ActionResult } from "@/lib/types";

const idSchema = z.uuid();

export async function setCurrentMember(memberId: string): Promise<ActionResult> {
  const parsed = idSchema.safeParse(memberId);
  if (!parsed.success) return { ok: false, error: "Neplatný člen." };

  // Only accept an id that actually exists, so a stale or hand-crafted cookie
  // can't put the app into a broken state.
  const member = await getMemberById(parsed.data);
  if (!member) return { ok: false, error: "Tento člen rodiny už neexistuje." };

  await writeMemberIdCookie(member.id);
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function clearCurrentMember(): Promise<ActionResult> {
  await clearMemberIdCookie();
  revalidatePath("/", "layout");
  return { ok: true };
}
