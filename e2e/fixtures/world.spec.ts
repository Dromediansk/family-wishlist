import sk from "../../messages/sk.json";
import { createOutsider, deleteOutsider, expect, test } from "./world";

test("both actors land in the same group and see each other", async ({
  world,
}) => {
  await world.owner.page.goto("/");
  await expect(world.owner.page).toHaveURL(`/g/${world.groupId}`);

  await world.giver.page.goto(`/g/${world.groupId}`);
  await expect(
    world.giver.page.getByRole("link", { name: world.owner.name }),
  ).toBeVisible();
});

test("a signed-in member of another group is refused this one", async ({
  world,
  browser,
}) => {
  // Signed in, and in a group of their own, so nothing before the membership
  // check can turn them away — not src/proxy.ts, which only catches a visitor
  // with no session at all and is an optimisation rather than the defence,
  // and not GroupLayout's redirect for an account with no groups. What is
  // left is enterGroup, which answers 404 rather than 403 so the URL says
  // nothing about which groups exist.
  const outsider = await createOutsider(world.runId);
  const context = await browser.newContext();
  try {
    await context.addCookies(outsider.account.cookies);
    const page = await context.newPage();

    const response = await page.goto(`/g/${world.groupId}`);
    expect(response?.status()).toBe(404);
    await expect(page.getByText(sk.notFound.title)).toBeVisible();
  } finally {
    await context.close();
    await deleteOutsider(outsider);
  }
});
