import sk from "../../messages/sk.json";
import { expect, type World } from "./world";

export async function addWish(world: World, title: string) {
  const { page } = world.owner;
  await page.goto(`/g/${world.groupId}`);
  await page.getByRole("button", { name: sk.wishes.add.action }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel(sk.wishes.form.title).fill(title);
  await dialog.getByRole("button", { name: sk.wishes.add.action }).click();
  await expect(dialog).toBeHidden();
}
