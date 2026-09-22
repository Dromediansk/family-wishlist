import { expect, test } from "@playwright/test";

import sk from "../../messages/sk.json";
import { adminClient } from "./stack";
import { createAccount, deleteAccount } from "./session";

test("a minted session lands a groupless account on /start", async ({
  browser,
}) => {
  // Random, not derived from the clock, for the reason `world` spells out:
  // desktop and phone run this file inside the same millisecond, and two
  // identical emails are rejected on users_email_partial_key.
  const runId = crypto.randomUUID().slice(0, 8);
  const account = await createAccount(runId, "solo", "Testovací Solo");
  const context = await browser.newContext();

  try {
    await context.addCookies(account.cookies);
    const page = await context.newPage();
    await page.goto("/");

    // An account in no group is a legal state, and /start is what it sees.
    await expect(page).toHaveURL(/\/start$/);
    await expect(
      page.getByRole("heading", { name: sk.start.welcome }),
    ).toBeVisible();
  } finally {
    await context.close();
    await deleteAccount(account);
  }

  // The one read the suite makes of a table. "Assert through the UI"
  // (docs/decisions/testing.md) is about app behaviour; this checks the
  // fixture's own teardown, which has no screen to assert on. The error is
  // destructured so a query that failed is not read as an empty result.
  const { data, error } = await adminClient()
    .from("app_users")
    .select("id")
    .eq("auth_user_id", account.authUserId);
  expect(error).toBeNull();
  expect(data).toHaveLength(0);
});
