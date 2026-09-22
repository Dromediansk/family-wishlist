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

  // Anchor first: both cards must actually be on the page, or the negative
  // assertion below would pass just as well for a page that rendered
  // nothing — a redirect, a notFound(), or MemberCard dropping its count
  // entirely. The name is a Link inside the card's h2, src/components/
  // member-card.tsx:57-62.
  await expect(
    owner.getByRole("link", { name: world.owner.name }),
  ).toBeVisible();
  await expect(
    owner.getByRole("link", { name: world.giver.name }),
  ).toBeVisible();

  /*
   * The owner's own card shows a bare count; only somebody else's card shows
   * the "available / all" pair, because on the owner's own list that pair
   * *is* the claim. src/components/member-card.tsx, docs/decisions/privacy-rule.md
   *
   * Asserted page-wide rather than scoped to the owner's card: MemberCard
   * renders a plain Card with no container role to scope to, and adding a
   * scope hook would mean a data-testid in src/, which this suite does not
   * do. In this world the giver has no wishes, so the giver's own card also
   * shows a bare count regardless — but the owner's card does not.
   *
   * Checked by hand: temporarily dropping the `viewerIsOwner` guard in
   * member-card.tsx's `available` (so the owner's own card takes the
   * non-owner branch) makes this assertion fail, with one match, whose text
   * is "1 / 1" — not "0 / 1". `toMemberSummary` (src/lib/members.ts) never
   * sets `availableCount` on the viewer's own card, so the mutated
   * `available` is `undefined`, and `leadCount = available ?? wishCount`
   * falls back to the bare `wishCount` (1) for both halves of the pair. The
   * sr-only span leaks too in that mutation ("undefined / 1 želanie"), but
   * doesn't match this regex (no digit before the slash), so it isn't what
   * this assertion caught. Reverted after.
   *
   * Coverage limit: this regex watches the pair *shape* (two numbers around
   * a slash). A regression that instead rendered a bare `availableCount` —
   * a lone "0" on the owner's one-wish card, with no slash at all — would
   * still leak the claim and would not be caught here.
   */
  await expect(owner.getByText(/\d+\s*\/\s*\d+/)).toHaveCount(0);
});

test("a hand-over live-syncs the owner's open tab, and the sync leaks nothing", async ({
  world,
}) => {
  const secret = `Termoska ${world.runId}`;
  const canary = `Kanárik ${world.runId}`;
  await addWish(world, secret);
  await addWish(world, canary);

  const owner = world.owner.page;
  await owner.goto(`/g/${world.groupId}/member/${world.owner.userId}`);
  await expect(owner.getByText(secret)).toBeVisible();
  await expect(owner.getByText(canary)).toBeVisible();

  // The owner's tab stays open for the whole exchange below.
  await reserve(world, secret);
  await reserve(world, canary);

  // Hand the canary over — same shape as e2e/journeys/giving.spec.ts. A
  // hand-over deletes the wish, which is the only observable change a giver
  // can cause on the owner's own list: a claim moves nothing there, not even
  // the badge (docs/decisions/live-updates.md#why-the-owners-tab-refreshes-too).
  const giver = world.giver.page;
  await giver.goto("/buying");
  await giver
    .getByRole("listitem")
    .filter({ hasText: canary })
    .getByRole("button", { name: sk.wishes.fulfil.action })
    .click();
  const confirm = giver.getByRole("alertdialog");
  await confirm.getByRole("button", { name: sk.wishes.fulfil.action }).click();
  await expect(confirm).toBeHidden();

  // No goto, no reload: waiting for the canary to disappear is waiting for
  // this exact tab to have processed a live sync (the debounced broadcast +
  // syncFromLive round trip), not asserting on the pre-sync DOM. The claim
  // and the hand-over travel the same channel, so this also proves the tab
  // was listening for the earlier, still-open claim on the secret.
  await expect(owner.getByText(canary)).toHaveCount(0);

  // That same re-rendered tab still keeps the secret's claim invisible.
  await expect(owner.getByText(secret)).toBeVisible();
  await expect(owner.getByText(world.giver.name)).toHaveCount(0);
  await expect(owner.getByText(sk.wishes.claimedBySomeone)).toHaveCount(0);
});
