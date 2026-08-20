import "server-only";

import { cache } from "react";

import { resolveAccess, seedPeers, type Access } from "@/lib/access";
import { asGroupId, asMembershipId, asUserId, type UserId } from "@/lib/ids";
import { getSupabase } from "@/lib/supabase";
import { getAuthUser } from "@/lib/supabase-auth";
import type { GroupContext, GroupRef, Role, Viewer } from "@/lib/types";

/**
 * The only place a `Viewer` is built.
 *
 * Two clients on purpose: the session comes from Supabase Auth, the rows from
 * service_role, and the link between them is `auth_user_id`, which the visitor
 * cannot influence. docs/content/privacy-rule.md
 */
export const getViewer = cache(async (): Promise<Viewer | null> => {
  const user = await getAuthUser();
  if (!user) return null;

  const supabase = getSupabase();

  const { data: account, error: accountError } = await supabase
    .from("app_users")
    .select("id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (accountError) throw accountError;
  if (!account) return null;

  const userId = asUserId((account as { id: string }).id);

  const [membershipsResult, peersResult] = await Promise.all([
    supabase
      .from("memberships")
      .select("group_id, role, groups (name)")
      .eq("user_id", userId)
      // preferredName and the switcher both depend on this order.
      .order("created_at", { ascending: true }),
    supabase.rpc("peer_user_ids", { p_user_id: userId }),
  ]);

  if (membershipsResult.error) throw membershipsResult.error;
  if (peersResult.error) throw peersResult.error;

  const groups: GroupRef[] = (
    (membershipsResult.data ?? []) as {
      group_id: string;
      role: string;
      groups: { name: string } | { name: string }[] | null;
    }[]
  ).map((row) => {
    const group = Array.isArray(row.groups) ? row.groups[0] : row.groups;
    return {
      id: asGroupId(row.group_id),
      name: group?.name ?? "?",
      role: row.role === "admin" ? "admin" : "member",
    };
  });

  /*
   * A `returns setof uuid` function comes back as bare strings from some
   * PostgREST versions and as wrapped objects from others, so both are read
   * rather than guessed at. `seedPeers` is what guarantees the viewer's own id
   * is in the set even when this query found nothing.
   */
  const peerIds: UserId[] = [];
  for (const row of (peersResult.data ?? []) as
    | { user_id?: string }[]
    | string[]) {
    const value = typeof row === "string" ? row : row.user_id;
    if (value) peerIds.push(asUserId(value));
  }

  return { userId, peers: seedPeers(userId, peerIds), groups };
});

export const getAccess = cache(async (): Promise<Access> => {
  const user = await getAuthUser();
  return resolveAccess({
    authUserId: user?.id ?? null,
    viewer: user ? await getViewer() : null,
  });
});

/**
 * Turn a group id off a URL into a `GroupContext`, or null if the viewer is not
 * in that group. The membership row is the proof; the id from the URL is only a
 * claim.
 */
export const enterGroup = cache(
  async (groupId: string): Promise<GroupContext | null> => {
    const viewer = await getViewer();
    if (!viewer) return null;

    const { data, error } = await getSupabase()
      .from("memberships")
      .select("id, group_id, role")
      .eq("user_id", viewer.userId)
      .eq("group_id", groupId)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    const row = data as { id: string; group_id: string; role: string };
    return {
      ...viewer,
      groupId: asGroupId(row.group_id),
      membershipId: asMembershipId(row.id),
      role: (row.role === "admin" ? "admin" : "member") satisfies Role,
    };
  },
);

/**
 * Make sure a signed-in Google account has a row in the app's identity table,
 * and do nothing when it already does.
 *
 * The one function here that takes no `Viewer`: it runs before one can exist,
 * because the row it writes is what a `Viewer` is built from. It is scoped all
 * the same — `authUserId` comes from the verified session, never from anything
 * a caller supplies.
 */
export async function ensureAppUser(
  authUserId: string,
  email: string | null,
): Promise<void> {
  const supabase = getSupabase();

  const { data: existing, error: lookupError } = await supabase
    .from("app_users")
    .select("id")
    .eq("auth_user_id", authUserId)
    .maybeSingle();

  // Don't strand a sign-in that otherwise worked — a missing app_users row reads
  // as signed out, which is the safe direction.
  if (lookupError) {
    console.warn("Could not check for an existing app_users row:", lookupError);
    return;
  }
  if (existing) return;

  const { error: insertError } = await supabase.from("app_users").insert({
    auth_user_id: authUserId,
    email,
    name: email?.split("@")[0]?.slice(0, 50) || "Bez mena",
  });

  // 23505 means the trigger got there first — the normal path, not a problem.
  if (insertError && insertError.code !== "23505") {
    console.warn("Could not create the app_users row:", insertError);
    return;
  }
}
