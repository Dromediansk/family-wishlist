import { NextResponse } from "next/server";

import { joinWithInvite } from "@/app/actions/invites";
import { getViewer } from "@/lib/data/access";
import { findInviteByToken } from "@/lib/data/invites";
import { INVITE_EXPIRED_MESSAGE, inviteUsable } from "@/lib/invites";

/**
 * The door into a group. A route handler, not a page, so every outcome can
 * redirect. The read here only decides *where* to send the browser —
 * `joinWithInvite` is the actual guard, and re-derives all of this for itself
 * because it is a Server Action reachable on its own.
 * docs/content/groups.md#invites
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;

  const redirectTo = (path: string) =>
    NextResponse.redirect(new URL(path, request.url));

  const invite = await findInviteByToken(token);
  if (!invite || !inviteUsable(invite, new Date())) {
    return redirectTo(
      `/start?error=${encodeURIComponent(INVITE_EXPIRED_MESSAGE)}`,
    );
  }

  const viewer = await getViewer();
  if (!viewer) {
    return redirectTo(
      `/login?returnTo=${encodeURIComponent(`/join/${token}`)}`,
    );
  }

  const result = await joinWithInvite(token);
  if (!result.ok) {
    return redirectTo(`/start?error=${encodeURIComponent(result.error)}`);
  }

  return redirectTo(`/g/${invite.groupId}`);
}
