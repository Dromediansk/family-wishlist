import { NextResponse } from "next/server";

import { joinWithInvite } from "@/app/actions/invites";
import { getErrorText } from "@/i18n/errors";
import { getViewer } from "@/lib/data/access";
import { findInviteByToken } from "@/lib/data/invites";
import { INVITE_EXPIRED_KEY, inviteUsable } from "@/lib/invites";

/**
 * The door into a group. A route handler, not a page, so every outcome can
 * redirect. The read here only decides *where* to send the browser —
 * `joinWithInvite` is the actual guard, and re-derives all of this for itself
 * because it is a Server Action reachable on its own.
 * docs/decisions/groups-and-invites.md#invites
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
    // A Route Handler can read the locale cookie like anything else on the
    // server, so the refusal it hands to `/start` is already in the right
    // language. docs/decisions/language.md
    const text = await getErrorText();
    return redirectTo(
      `/start?error=${encodeURIComponent(text(INVITE_EXPIRED_KEY))}`,
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
