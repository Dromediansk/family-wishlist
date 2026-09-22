import sk from "../../messages/sk.json";
import { createAccount, deleteAccount } from "../fixtures/session";
import { expect, test } from "../fixtures/world";

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
     * `src/app/join/[token]/route.ts` redirects via `new URL(path,
     * request.url)`. Confirmed with `curl` (and by instrumenting
     * node_modules/next's dev bundler, not by guessing): the App Router dev
     * bundler's RouterServerContext hostname comes from
     * `node_modules/next/dist/server/lib/router-utils/setup-dev-bundler.js`'s
     * `appUrl = process.env.__NEXT_PRIVATE_ORIGIN ?? \`http://localhost:${port}\``
     * — hardcoded to "localhost" and blind to `--hostname`, even though
     * `playwright.config.ts` now pins `next dev` to `127.0.0.1` to match
     * `baseURL`. So the join redirect still lands the browser on `localhost`,
     * a different origin from the newcomer's `127.0.0.1`-scoped cookie — a
     * dev-server-only artifact (one canonical domain in production), not a
     * change to what this journey proves. The session is addressed at
     * `localhost` throughout rather than stopping the test short of the
     * follow-through a real click would make.
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
