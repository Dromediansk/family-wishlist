import sk from "../../messages/sk.json";
import { addWish } from "../fixtures/wishes";
import { expect, test } from "../fixtures/world";

test("a giver reserves a wish, hands it over, and both see the record", async ({
  world,
}) => {
  const title = `Kniha ${world.runId}`;
  await addWish(world, title);

  const giver = world.giver.page;
  await giver.goto(`/g/${world.groupId}/member/${world.owner.userId}`);

  const row = giver.getByRole("listitem").filter({ hasText: title });
  await row.getByRole("button", { name: sk.wishes.claim }).click();

  // It is now the giver's to release or hand over.
  await expect(row.getByRole("button", { name: sk.wishes.release })).toBeVisible();

  // And it is on their buying list.
  await giver.goto("/buying");
  await expect(giver.getByText(title)).toBeVisible();

  // Hand it over. The question names the wish and its owner.
  await giver
    .getByRole("listitem")
    .filter({ hasText: title })
    .getByRole("button", { name: sk.wishes.fulfil.action })
    .click();
  const confirm = giver.getByRole("alertdialog");
  await confirm.getByRole("button", { name: sk.wishes.fulfil.action }).click();
  await expect(confirm).toBeHidden();

  // The giver's history holds it, and so does the owner's received list —
  // which is the first and only place the owner learns who it was from.
  await giver.goto("/buying/history");
  await expect(giver.getByText(title)).toBeVisible();

  await world.owner.page.goto("/received");
  await expect(world.owner.page.getByText(title)).toBeVisible();
  await expect(world.owner.page.getByText(world.giver.name)).toBeVisible();
});
