import sk from "../../messages/sk.json";
import { expect, test, type World } from "../fixtures/world";

async function addWish(world: World, title: string) {
  const { page } = world.owner;
  await page.goto(`/g/${world.groupId}`);
  await page.getByRole("button", { name: sk.wishes.add.action }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel(sk.wishes.form.title).fill(title);
  await dialog.getByRole("button", { name: sk.wishes.add.action }).click();
  await expect(dialog).toBeHidden();
}

test("an owner adds a wish and finds it on their own list", async ({
  world,
}) => {
  const title = `Hrnček ${world.runId}`;
  await addWish(world, title);

  await world.owner.page.goto(
    `/g/${world.groupId}/member/${world.owner.userId}`,
  );
  await expect(world.owner.page.getByText(title)).toBeVisible();
});

test("a member of the group sees it too", async ({ world }) => {
  const title = `Šál ${world.runId}`;
  await addWish(world, title);

  await world.giver.page.goto(
    `/g/${world.groupId}/member/${world.owner.userId}`,
  );
  await expect(world.giver.page.getByText(title)).toBeVisible();
});
