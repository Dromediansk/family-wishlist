import type { Cookie } from "@playwright/test";
import { createServerClient } from "@supabase/ssr";

import { adminClient, localStack } from "./stack";

export type Account = {
  /** auth.users.id — the handle teardown deletes by. */
  authUserId: string;
  /** app_users.id — what the app's own rows point at. */
  userId: string;
  name: string;
  email: string;
  cookies: Cookie[];
};

/**
 * A signed-in browser, without signing in.
 *
 * Google is the only door (docs/decisions/identity-and-sessions.md) and
 * Playwright cannot drive a consent screen, so the session is minted out of
 * band: an admin magic link, verified against a @supabase/ssr client whose
 * cookie jar is the browser's. The cookies are therefore written by the same
 * library src/proxy.ts reads them with — this does not model the format, it
 * borrows the implementation of it.
 *
 * signInWithPassword is NOT an option: supabase/config.toml sets
 * enable_signup = false, which disables the email provider outright.
 * docs/superpowers/specs/2026-09-18-e2e-testing-design.md
 */
export async function createAccount(
  runId: string,
  role: string,
  name: string,
): Promise<Account> {
  const { url, anonKey } = localStack();
  const db = adminClient();
  const email = `${role}-${runId}@e2e.local`;

  const { data: created, error: createError } = await db.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: { full_name: name },
  });
  if (createError) throw createError;
  const authUserId = created.user.id;

  // From here on, any throw leaves an orphaned auth user behind unless we
  // clean it up ourselves — the caller has no Account yet to pass to
  // deleteAccount. Every call site (this test, and Tasks 4/7's multi-account
  // fixtures) is protected once here rather than in each caller's try/finally.
  try {
    // handle_new_auth_user provisions this row; the test does not fake it.
    const { data: rows, error: rowError } = await db
      .from("app_users")
      .select("id")
      .eq("auth_user_id", authUserId);
    if (rowError) throw rowError;
    if (rows?.length !== 1) {
      throw new Error(
        `Expected one app_users row for ${email}, got ${rows?.length ?? 0}. ` +
          "The provisioning trigger did not fire.",
      );
    }

    const { data: link, error: linkError } = await db.auth.admin.generateLink({
      type: "magiclink",
      email,
    });
    if (linkError) throw linkError;

    const jar = new Map<string, string>();
    const ssr = createServerClient(url, anonKey, {
      cookies: {
        getAll: () => [...jar].map(([name, value]) => ({ name, value })),
        setAll: (list) => {
          for (const { name, value } of list) jar.set(name, value);
        },
      },
    });

    const { error: verifyError } = await ssr.auth.verifyOtp({
      token_hash: link.properties.hashed_token,
      type: "email",
    });
    if (verifyError) throw verifyError;

    // Every cookie, not the first: at ~2.7 KB the session is one long name
    // away from @supabase/ssr splitting it into .0 and .1.
    const cookies: Cookie[] = [...jar].map(([cookieName, value]) => ({
      name: cookieName,
      value,
      domain: "127.0.0.1",
      path: "/",
      expires: -1,
      httpOnly: false,
      secure: false,
      sameSite: "Lax" as const,
    }));

    return { authUserId, userId: rows[0].id as string, name, email, cookies };
  } catch (err) {
    // Best-effort: the original error is the diagnostic. A cleanup failure
    // must not mask it, so it is swallowed rather than rethrown or combined.
    await db.auth.admin.deleteUser(authUserId).catch(() => {});
    throw err;
  }
}

/** The cascade does the rest: app_users, memberships, wishes, notes, invites. */
export async function deleteAccount(account: Account): Promise<void> {
  const { error } = await adminClient().auth.admin.deleteUser(
    account.authUserId,
  );
  if (error) throw error;
}
