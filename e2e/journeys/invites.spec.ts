import sk from "../../messages/sk.json";
import { createAccount, deleteAccount, signIn } from "../fixtures/session";
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
  const { context, page } = await signIn(browser, newcomer);
  try {
    await page.goto(link);

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
