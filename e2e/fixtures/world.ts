import { test as base, expect, type Page } from "@playwright/test";

import { adminClient } from "./stack";
import { createAccount, deleteAccount, type Account } from "./session";

export type Actor = Account & { page: Page };

export type World = {
  runId: string;
  groupId: string;
  groupName: string;
  owner: Actor;
  giver: Actor;
};

/**
 * One group, two actors, each with a browser already signed in as them.
 *
 * A group is the boundary that decides who sees whom, so it is the boundary a
 * test gets: two files can never see each other's data, and the suite runs in
 * parallel. Two actors because the one rule is a statement about what one
 * person's page does not show while another person's does.
 *
 * docs/decisions/testing.md
 */
async function makeGroup(runId: string, ownerUserId: string) {
  const db = adminClient();
  const groupName = `E2E ${runId}`;

  const { data: group, error } = await db
    .from("groups")
    .insert({ name: groupName, created_by: ownerUserId })
    .select("id")
    .single();
  if (error) throw error;

  return { groupId: group.id as string, groupName };
}

async function join(
  groupId: string,
  userId: string,
  name: string,
  role: "admin" | "member",
) {
  const { error } = await adminClient()
    .from("memberships")
    .insert({ group_id: groupId, user_id: userId, name, role });
  if (error) throw error;
}

export const test = base.extend<{ world: World }>({
  world: async ({ browser }, use) => {
    /*
     * Random, not derived from the clock. `fullyParallel` runs the desktop and
     * phone projects over the same file at once, and Task 3 proved a
     * `Date.now()` id collides inside one millisecond — two identical emails,
     * and GoTrue rejects the second on `users_email_partial_key`. Worker index
     * does not save it either: two projects can share a worker index.
     */
    const runId = crypto.randomUUID().slice(0, 8);

    let ownerAccount: Account | undefined;
    let giverAccount: Account | undefined;
    let groupId: string | undefined;
    let groupName: string | undefined;

    try {
      ownerAccount = await createAccount(runId, "owner", "Oliver Obdarovaný");
      giverAccount = await createAccount(runId, "giver", "Gabika Darkyňa");

      ({ groupId, groupName } = await makeGroup(runId, ownerAccount.userId));

      await join(groupId, ownerAccount.userId, ownerAccount.name, "admin");
      await join(groupId, giverAccount.userId, giverAccount.name, "member");
    } catch (err) {
      // createAccount only self-cleans its own partial failure. A later step
      // in this setup — the other account, the group, a membership — can
      // still throw after an earlier one succeeded, and Playwright never runs
      // the code after use() when the code before it throws. So whatever this
      // block has already created has to be torn down here, or it leaks for
      // every test in the suite.
      if (groupId) {
        try {
          await adminClient().from("groups").delete().eq("id", groupId);
        } catch {
          // Best-effort: the original error below is the diagnostic.
        }
      }
      if (giverAccount) await deleteAccount(giverAccount).catch(() => {});
      if (ownerAccount) await deleteAccount(ownerAccount).catch(() => {});
      throw err;
    }

    const ownerContext = await browser.newContext();
    const giverContext = await browser.newContext();
    await ownerContext.addCookies(ownerAccount.cookies);
    await giverContext.addCookies(giverAccount.cookies);

    const owner: Actor = { ...ownerAccount, page: await ownerContext.newPage() };
    const giver: Actor = { ...giverAccount, page: await giverContext.newPage() };

    // Playwright's fixture callback parameter is conventionally named `use`,
    // which react-hooks/rules-of-hooks mistakes for React 19's `use()` hook.
    // eslint-disable-next-line react-hooks/rules-of-hooks
    await use({ runId, groupId, groupName, owner, giver });

    await ownerContext.close();
    await giverContext.close();
    // Deleting the accounts is the whole teardown: the cascade takes the
    // memberships, the wishes, the wish_groups, the notes and the invites, so
    // a table added later cannot be forgotten here.
    await deleteAccount(ownerAccount);
    await deleteAccount(giverAccount);
    // The group's created_by is ON DELETE SET NULL, so the row outlives its
    // creator and has to go by hand.
    await adminClient().from("groups").delete().eq("id", groupId);
  },
});

export { expect };
