import sk from "../../messages/sk.json";
import { addWish } from "../fixtures/wishes";
import { expect, test, type World } from "../fixtures/world";

/**
 * PRIVACY-RULE: the end-to-end half. Every enforcement site rg 'PRIVACY-RULE:'
 * lists is individually reviewed; these are what check that they compose.
 * docs/decisions/privacy-rule.md
 */

/** Reserve `title` from the owner's list, as the giver. */
async function reserve(world: World, title: string) {
  const giver = world.giver.page;
  await giver.goto(`/g/${world.groupId}/member/${world.owner.userId}`);
  await giver
    .getByRole("listitem")
    .filter({ hasText: title })
    .getByRole("button", { name: sk.wishes.claim })
    .click();
  await expect(
    giver
      .getByRole("listitem")
      .filter({ hasText: title })
      .getByRole("button", { name: sk.wishes.release }),
  ).toBeVisible();
}

test("the owner's own list shows no claim, and names nobody", async ({
  world,
}) => {
  const title = `Rukavice ${world.runId}`;
  await addWish(world, title);
  await reserve(world, title);

  const owner = world.owner.page;
  await owner.goto(`/g/${world.groupId}/member/${world.owner.userId}`);

  await expect(owner.getByText(title)).toBeVisible();
  await expect(owner.getByText(world.giver.name)).toHaveCount(0);
  await expect(owner.getByText(sk.wishes.claimedBySomeone)).toHaveCount(0);
  await expect(
    owner.getByRole("button", { name: sk.wishes.release }),
  ).toHaveCount(0);
});

test("the owner's grid count does not betray the claim either", async ({
  world,
}) => {
  const title = `Šatka ${world.runId}`;
  await addWish(world, title);
  await reserve(world, title);

  const owner = world.owner.page;
  await owner.goto(`/g/${world.groupId}`);

  /*
   * The owner's own card shows a bare count; only somebody else's card shows
   * the "available / all" pair, because on the owner's own list that pair
   * *is* the claim. src/components/member-card.tsx, docs/decisions/privacy-rule.md
   *
   * Asserted page-wide rather than scoped to the owner's card: MemberCard
   * renders a plain Card with no container role to scope to, and adding a
   * scope hook would mean a data-testid in src/, which this suite does not
   * do. In this world the giver has no wishes, so the giver's own card also
   * shows a bare count regardless — but the owner's card does not, and
   * checked by hand (temporarily dropping the `viewerIsOwner` guard in
   * member-card.tsx and reverting), a regression that leaked the pair onto
   * the owner's own card makes this assertion fail: "0 / 1" appears and the
   * regex catches it, not the sr-only count (which only grows a "N / "
   * prefix when `available !== null`, so it stays slash-free right along
   * with the visible count whenever the guard holds).
   */
  await expect(owner.getByText(/\d+\s*\/\s*\d+/)).toHaveCount(0);
});

test("a live reservation re-renders the owner's open tab and still leaks nothing", async ({
  world,
}) => {
  const title = `Termoska ${world.runId}`;
  await addWish(world, title);

  const owner = world.owner.page;
  await owner.goto(`/g/${world.groupId}/member/${world.owner.userId}`);
  await expect(owner.getByText(title)).toBeVisible();

  // The owner's tab stays open while somebody else reserves.
  await reserve(world, title);

  // The ping is an empty broadcast answered by syncFromLive, so the only
  // correct wait is an auto-retrying assertion on what the page must never say.
  await expect(owner.getByText(world.giver.name)).toHaveCount(0);
  await expect(owner.getByText(title)).toBeVisible();
});
