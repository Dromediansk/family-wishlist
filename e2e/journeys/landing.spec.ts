import { expect, test } from "@playwright/test";

import sk from "../../messages/sk.json";

/**
 * The only screen a stranger can reach. No fixture, no session — if this fails,
 * the harness is wrong, not the app.
 */
test("a signed-out visitor is offered the way in", async ({ page }) => {
  await page.goto("/");
  // Rendered twice on this page — hero and footer CTA — src/components/landing/sign-in.tsx.
  await expect(
    page.getByRole("button", { name: sk.login.signIn }).first(),
  ).toBeVisible();
});
