import { addWish, fulfil, reserve } from "../fixtures/wishes";
import { expect, test } from "../fixtures/world";

test("a giver reserves a wish, hands it over, and both see the record", async ({
  world,
}) => {
  const title = `Kniha ${world.runId}`;
  await addWish(world, title);
  await reserve(world, title);

  // And it is on their buying list.
  const giver = world.giver.page;
  await giver.goto("/buying");
  await expect(giver.getByText(title)).toBeVisible();

  await fulfil(world, title);

  // The giver's history holds it, and so does the owner's received list —
  // which is the first and only place the owner learns who it was from.
  await giver.goto("/buying/history");
  await expect(giver.getByText(title)).toBeVisible();

  await world.owner.page.goto("/received");
  await expect(world.owner.page.getByText(title)).toBeVisible();
  await expect(world.owner.page.getByText(world.giver.name)).toBeVisible();
});
