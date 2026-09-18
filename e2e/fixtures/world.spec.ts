import { expect, test } from "./world";

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

test("the giver cannot reach a group they are not in", async ({
  world,
  browser,
}) => {
  const context = await browser.newContext();
  try {
    const page = await context.newPage();
    // No cookies: a stranger is bounced to the front door, not shown the grid.
    await page.goto(`/g/${world.groupId}`);
    await expect(page).toHaveURL("/");
  } finally {
    await context.close();
  }
});
