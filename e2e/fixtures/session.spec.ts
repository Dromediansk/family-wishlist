import { expect, test } from "@playwright/test";

import sk from "../../messages/sk.json";
import { adminClient } from "./stack";
import { createAccount, deleteAccount } from "./session";

test("a minted session lands a groupless account on /start", async ({
  browser,
}) => {
  // desktop and phone run this file in the same millisecond, so Date.now()
  // alone collides on two accounts' emails; the suffix keeps them apart.
  const runId = `sess${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
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

  const { data } = await adminClient()
    .from("app_users")
    .select("id")
    .eq("auth_user_id", account.authUserId);
  expect(data).toHaveLength(0);
});
