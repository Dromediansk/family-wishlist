import sk from "../../messages/sk.json";
import { addWish, fulfil, reserve } from "../fixtures/wishes";
import { expect, test } from "../fixtures/world";

/**
 * PRIVACY-RULE: the end-to-end half. Every enforcement site rg 'PRIVACY-RULE:'
 * lists is individually reviewed; these are what check that they compose.
 * docs/decisions/privacy-rule.md
 */

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

  /*
   * Not just what is drawn. The rule is about what the owner can *learn*, and
   * a path that selected claimed_by_user_id and handed it to a client
   * component would serialise the giver's id into the RSC flight payload,
   * render nothing, and satisfy every assertion above.
   *
   * One row of that payload names the giver for a reason that is not a claim:
   * the activity bell's `member-joined` item. The feed is the one owner-facing
   * path allowed to name a peer, because its query filters the owner's own
   * wishes out (docs/decisions/privacy-rule.md#the-activity-feed) — so it is
   * excluded by that kind, and a `wish-claimed` item naming them would still
   * be caught here.
   */
  const rows = (await owner.content()).split("\\n");

  // Anchor the exclusion: the bell's item has to be its own row of the
  // payload. If the framing ever changes, everything lands in one row and
  // the filter below would quietly swallow the whole page.
  const feed = rows.filter((row) => row.includes("member-joined"));
  expect(feed).toHaveLength(1);
  expect(feed[0]).not.toContain(title);

  const leaks = rows.filter(
    (row) => row.includes(world.giver.userId) && !row.includes("member-joined"),
  );
  expect(leaks).toEqual([]);
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
   * shows a bare count regardless — but the owner's card does not. Dropping
   * member-card.tsx's `viewerIsOwner` guard by hand makes this fail.
   *
   * Coverage limit: this regex watches the pair *shape* (two numbers around
   * a slash). A regression that instead rendered a bare `availableCount` —
   * a lone "0" on the owner's one-wish card, with no slash at all — would
   * still leak the claim and would not be caught here.
   */
  await expect(owner.getByText(/\d+\s*\/\s*\d+/)).toHaveCount(0);
});

test("a reserved wish is frozen, and the refusal does not say by whom", async ({
  world,
}) => {
  const title = `Hrnček ${world.runId}`;
  await addWish(world, title);
  await reserve(world, title);

  // The deliberate exception: nothing on the list is disabled or badged, so
  // the owner opens the same form as always — and only the save is refused.
  // docs/decisions/privacy-rule.md#the-deliberate-exception-a-reserved-wish-is-frozen
  const owner = world.owner.page;
  await owner.goto(`/g/${world.groupId}/member/${world.owner.userId}`);
  await owner
    .getByRole("listitem")
    .filter({ hasText: title })
    .getByRole("button", { name: sk.wishes.edit.trigger.replace("{title}", title) })
    .click();

  const dialog = owner.getByRole("dialog");
  await dialog.getByRole("button", { name: sk.wishes.edit.submit }).click();

  // refusalFor's wording is unit-tested (src/lib/wishes.test.ts); what is
  // only checkable here is that the dialog renders it and nothing more.
  // The first assertion is also the wait — a count of zero is true of a
  // dialog that has not answered yet, so the second one needs it in front.
  await expect(dialog.getByRole("alert")).toHaveText(sk.errors.updateReserved);
  await expect(owner.getByText(world.giver.name)).toHaveCount(0);
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

  // Hand the canary over. A hand-over deletes the wish, which is the only
  // observable change a giver can cause on the owner's own list: a claim
  // moves nothing there, not even the badge
  // (docs/decisions/live-updates.md#why-the-owners-tab-refreshes-too).
  await fulfil(world, canary);

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
