import sk from "../../messages/sk.json";
import { adminClient } from "../fixtures/stack";
import { ownListPath, t } from "../fixtures/wishes";
import { expect, test, type World } from "../fixtures/world";

/** Put a wish straight into the database, dated as the test needs. */
async function seedWish(world: World, title: string, neededBy: string) {
  const db = adminClient();
  const { data, error } = await db
    .from("wishes")
    .insert({ owner_user_id: world.owner.userId, title, needed_by: neededBy })
    .select("id")
    .single();
  if (error) throw error;
  const { error: tagError } = await db
    .from("wish_groups")
    .insert({ wish_id: data.id, group_id: world.groupId });
  if (tagError) throw tagError;
}

test("a member sees the day an owner needs a wish by", async ({ world }) => {
  const title = `Dáždnik ${world.runId}`;
  const { page } = world.owner;
  await page.goto(`/g/${world.groupId}`);
  await page.getByRole("button", { name: sk.wishes.add.action }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel(sk.wishes.form.title).fill(title);
  await dialog.getByLabel(sk.wishes.form.neededBy).fill("2099-12-24");
  await dialog.getByRole("button", { name: sk.wishes.add.action }).click();
  await expect(dialog).toBeHidden();

  await world.giver.page.goto(ownListPath(world));
  const row = world.giver.page.getByRole("listitem").filter({ hasText: title });
  await expect(
    row.getByText(t("wishes.neededBy.upcoming", { date: "24. decembra 2099" })),
  ).toBeVisible();
});

test("an owner can fix an overdue wish without re-dating it", async ({
  world,
}) => {
  const title = `Kufor ${world.runId}`;
  await seedWish(world, title, "2020-01-15");
  const { page } = world.owner;
  await page.goto(ownListPath(world));

  await page
    .getByRole("button", { name: t("wishes.edit.trigger", { title }) })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel(sk.wishes.form.title).fill(`${title} (modrý)`);
  await dialog.getByRole("button", { name: sk.wishes.edit.submit }).click();
  await expect(dialog).toBeHidden();

  const row = page
    .getByRole("listitem")
    .filter({ hasText: `${title} (modrý)` });
  await expect(
    row.getByText(t("wishes.neededBy.passed", { date: "15. januára 2020" })),
  ).toBeVisible();
});

test("a day already gone is refused, and the form stays open", async ({
  world,
}) => {
  const { page } = world.owner;
  await page.goto(`/g/${world.groupId}`);
  await page.getByRole("button", { name: sk.wishes.add.action }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel(sk.wishes.form.title).fill(`Starý ${world.runId}`);
  await dialog.getByLabel(sk.wishes.form.neededBy).fill("2020-01-01");
  await dialog.getByRole("button", { name: sk.wishes.add.action }).click();

  await expect(dialog.getByRole("alert")).toHaveText(sk.errors.neededByPast);
  await expect(dialog).toBeVisible();
});
