import { addWish, ownListPath } from "../fixtures/wishes";
import { expect, test } from "../fixtures/world";

test("an owner adds a wish and finds it on their own list", async ({
  world,
}) => {
  const title = `Hrnček ${world.runId}`;
  await addWish(world, title);

  await world.owner.page.goto(ownListPath(world));
  await expect(world.owner.page.getByText(title)).toBeVisible();
});

test("a member of the group sees it too", async ({ world }) => {
  const title = `Šál ${world.runId}`;
  await addWish(world, title);

  await world.giver.page.goto(ownListPath(world));
  await expect(world.giver.page.getByText(title)).toBeVisible();
});
