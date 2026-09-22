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
async function makeGroup(runId: string, ownerUserId: string, label = "E2E") {
  const db = adminClient();
  const groupName = `${label} ${runId}`;

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

/** An account of its own, in a group of its own. */
export type Outsider = { account: Account; groupId: string };

/**
 * The neighbour a group-scoped read must never answer: signed in, and a
 * member somewhere — just not here.
 *
 * The group of their own is the point. An account in no group at all is turned
 * away by `GroupLayout`'s `redirect("/start")` before `enterGroup` is ever
 * asked, so it would prove only that the groupless branch works — and a
 * regression handing every group to every signed-in account would pass. With a
 * membership somewhere, the only thing left to refuse the URL is the
 * membership check on the group in it.
 */
export async function createOutsider(runId: string): Promise<Outsider> {
  const account = await createAccount(runId, "outsider", "Cudzia Pani");
  try {
    const { groupId } = await makeGroup(runId, account.userId, "E2E outsider");
    await join(groupId, account.userId, account.name, "admin");
    return { account, groupId };
  } catch (err) {
    await deleteAccount(account).catch(() => {});
    throw err;
  }
}

/** Their account, then their group — `created_by` is ON DELETE SET NULL. */
export async function deleteOutsider({
  account,
  groupId,
}: Outsider): Promise<void> {
  await deleteAccount(account);
  const { error } = await adminClient()
    .from("groups")
    .delete()
    .eq("id", groupId);
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

    /*
     * Every delete runs even if an earlier one throws — the same failure mode
     * the setup block above guards against, and stranding the second account
     * and the group is worse than one loud error. The first is rethrown once
     * the rest have run.
     */
    const failures: unknown[] = [];
    const attempt = async (step: () => Promise<unknown>) => {
      try {
        await step();
      } catch (err) {
        failures.push(err);
      }
    };

    /*
     * `fulfilled_wishes` first, while the ids still match. Deleting the
     * accounts takes almost everything with it — the memberships, the wishes,
     * the wish_groups, the notes and the invites all cascade — but both of
     * this table's foreign keys are ON DELETE SET NULL
     * (0008_multi_tenant.sql), deliberately: a gift that changed hands has to
     * outlive either party leaving. So the cascade spares these rows, and
     * after the account delete `owner_id` and `giver_id` are both NULL and
     * the run's own rows can no longer be told from anybody else's.
     */
    const { userId: ownerId } = ownerAccount;
    const { userId: giverId } = giverAccount;
    await attempt(async () => {
      const { error } = await adminClient()
        .from("fulfilled_wishes")
        .delete()
        .or(`owner_id.eq.${ownerId},giver_id.eq.${giverId}`);
      if (error) throw error;
    });

    await attempt(() => deleteAccount(ownerAccount));
    await attempt(() => deleteAccount(giverAccount));
    // The group's created_by is ON DELETE SET NULL, so the row outlives its
    // creator and has to go by hand.
    await attempt(async () => {
      const { error } = await adminClient()
        .from("groups")
        .delete()
        .eq("id", groupId);
      if (error) throw error;
    });

    if (failures.length > 0) throw failures[0];
  },
});

export { expect };
