import sk from "../../messages/sk.json";
import { expect, type World } from "./world";

/**
 * The three steps a gift passes through, each as one actor does it. They live
 * here rather than in a spec because both the journey and the privacy suite
 * walk the same flow, and two dialects of it would be two things to keep true.
 * Each keeps its own assertion, so a step that did not land fails here.
 */

/** Add `title` to the owner's own list, as the owner. */
export async function addWish(world: World, title: string) {
  const { page } = world.owner;
  await page.goto(`/g/${world.groupId}`);
  await page.getByRole("button", { name: sk.wishes.add.action }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel(sk.wishes.form.title).fill(title);
  await dialog.getByRole("button", { name: sk.wishes.add.action }).click();
  await expect(dialog).toBeHidden();
}

/** Reserve `title` from the owner's list, as the giver. */
export async function reserve(world: World, title: string) {
  const giver = world.giver.page;
  await giver.goto(`/g/${world.groupId}/member/${world.owner.userId}`);
  const row = giver.getByRole("listitem").filter({ hasText: title });
  await row.getByRole("button", { name: sk.wishes.claim }).click();
  // It is now the giver's to release or hand over.
  await expect(row.getByRole("button", { name: sk.wishes.release })).toBeVisible();
}

/** Hand `title` over from the giver's buying list, and confirm. */
export async function fulfil(world: World, title: string) {
  const giver = world.giver.page;
  await giver.goto("/buying");
  await giver
    .getByRole("listitem")
    .filter({ hasText: title })
    .getByRole("button", { name: sk.wishes.fulfil.action })
    .click();
  // The question names the wish and its owner; confirming ends the secret.
  const confirm = giver.getByRole("alertdialog");
  await confirm.getByRole("button", { name: sk.wishes.fulfil.action }).click();
  await expect(confirm).toBeHidden();
}
