import sk from "../../messages/sk.json";
import { createAccount, deleteAccount } from "../fixtures/session";
import { expect, test } from "../fixtures/world";

// Clipboard permissions are per-origin and per-context; `playwright.config.ts`
// grants clipboard-read/write for every project, and both `desktop` and
// `phone` were confirmed to honor it here, so no restriction is needed.
test("an admin mints a link and a stranger joins on it", async ({
  world,
  browser,
}) => {
  // The owner is the group's admin — see the world fixture.
  const admin = world.owner.page;
  await admin.goto(`/g/${world.groupId}/family`);
  await admin.getByRole("button", { name: sk.invites.create }).click();

  await admin
    .getByRole("button", { name: sk.invites.copyLink })
    .first()
    .click();
  const link = await admin.evaluate(() => navigator.clipboard.readText());
  expect(link).toContain("/join/");

  const newcomer = await createAccount(world.runId, "newcomer", "Nová Nováková");
  const context = await browser.newContext();
  try {
    /*
     * `next dev` answers to the hostname it was initialized with —
     * "localhost" by default — and `src/app/join/[token]/route.ts` builds its
     * own redirect from `request.url`, so it resolves against that canonical
     * host regardless of which alias the request arrived on. Playwright's
     * baseURL is `127.0.0.1` (chosen so a checkout's own `npm run dev` on
     * `localhost:3000` never collides — playwright.config.ts), so the join
     * redirect lands the browser on `localhost`: a different origin from a
     * `127.0.0.1`-scoped cookie. That split is a dev-server-only artifact —
     * production serves one canonical domain — so the newcomer's session is
     * addressed at `localhost` throughout, rather than weakening the test to
     * stop short of the follow-through a real click would make.
     */
    await context.addCookies(
      newcomer.cookies.map((cookie) => ({ ...cookie, domain: "localhost" })),
    );
    const page = await context.newPage();
    await page.goto(link.replace("127.0.0.1", "localhost"));

    // Opening the link *is* joining — nothing to approve.
    await expect(page).toHaveURL(new RegExp(`/g/${world.groupId}$`));
    await expect(
      page.getByRole("link", { name: world.owner.name }),
    ).toBeVisible();
  } finally {
    await context.close();
    await deleteAccount(newcomer);
  }
});
