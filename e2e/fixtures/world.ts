import { test as base, expect, type Page } from "@playwright/test";

import { adminClient, newRunId } from "./stack";
import { createAccount, deleteAccount, signIn, type Account } from "./session";

export type Actor = Account & { page: Page };

export type World = {
  runId: string;
  groupId: string;
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
  const { data: group, error } = await adminClient()
    .from("groups")
    .insert({ name: `${label} ${runId}`, created_by: ownerUserId })
    .select("id")
    .single();
  if (error) throw error;

  return group.id as string;
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

/**
 * Every step runs even if an earlier one throws, and the first error is
 * rethrown once the last has. A teardown that gives up halfway strands
 * exactly the rows it exists to remove.
 */
type Step = () => Promise<unknown>;

async function deleteAll(steps: readonly Step[]) {
  const failures: unknown[] = [];
  for (const step of steps) {
    try {
      await step();
    } catch (err) {
      failures.push(err);
    }
  }
  if (failures.length > 0) throw failures[0];
}

/**
 * Runs `build`, handing it `undo` to register how to remove each thing it
 * creates. If `build` throws, everything registered so far is removed — newest
 * first, best effort, since the original error is the diagnostic — and the
 * error rethrown. Otherwise the steps are returned for the caller's teardown.
 */
async function withUndo<T>(
  build: (undo: (step: Step) => void) => Promise<T>,
): Promise<[T, Step[]]> {
  const steps: Step[] = [];
  try {
    return [await build((step) => steps.unshift(step)), steps];
  } catch (err) {
    await deleteAll(steps).catch(() => {});
    throw err;
  }
}

/** Creates the account and registers its removal. */
async function tracked(
  undo: (step: Step) => void,
  ...args: Parameters<typeof createAccount>
): Promise<Account> {
  const account = await createAccount(...args);
  undo(() => deleteAccount(account));
  return account;
}

/** By hand: `groups.created_by` is ON DELETE SET NULL, so a group outlives
 * the account that made it. */
async function deleteGroup(groupId: string) {
  const { error } = await adminClient()
    .from("groups")
    .delete()
    .eq("id", groupId);
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
  const [outsider] = await withUndo(async (undo) => {
    const account = await tracked(undo, runId, "outsider", "Cudzia Pani");
    const groupId = await makeGroup(runId, account.userId, "E2E outsider");
    undo(() => deleteGroup(groupId));
    await join(groupId, account.userId, account.name, "admin");
    return { account, groupId };
  });
  return outsider;
}

/** Their account, then their group, and the group goes even if the account
 * delete throws — otherwise it is stranded exactly as the world's was. */
export async function deleteOutsider({
  account,
  groupId,
}: Outsider): Promise<void> {
  await deleteAll([() => deleteAccount(account), () => deleteGroup(groupId)]);
}

export const test = base.extend<{ world: World }>({
  world: async ({ browser }, use) => {
    const runId = newRunId();

    // Playwright never runs the code after use() when the code before it
    // throws, so a half-built world is torn down by withUndo instead.
    const [{ groupId, ownerAccount, giverAccount }, teardown] = await withUndo(
      async (undo) => {
        const ownerAccount = await tracked(
          undo,
          runId,
          "owner",
          "Oliver Obdarovaný",
        );
        const giverAccount = await tracked(
          undo,
          runId,
          "giver",
          "Gabika Darkyňa",
        );

        const groupId = await makeGroup(runId, ownerAccount.userId);
        undo(() => deleteGroup(groupId));
        await join(groupId, ownerAccount.userId, ownerAccount.name, "admin");
        await join(groupId, giverAccount.userId, giverAccount.name, "member");

        // First, while the ids still match: the account cascade spares
        // `fulfilled_wishes` and nulls both its ids. docs/decisions/testing.md
        undo(async () => {
          const { error } = await adminClient()
            .from("fulfilled_wishes")
            .delete()
            .or(
              `owner_id.eq.${ownerAccount.userId},giver_id.eq.${giverAccount.userId}`,
            );
          if (error) throw error;
        });

        return { groupId, ownerAccount, giverAccount };
      },
    );

    const [ownerSession, giverSession] = await Promise.all([
      signIn(browser, ownerAccount),
      signIn(browser, giverAccount),
    ]);
    const owner: Actor = { ...ownerAccount, page: ownerSession.page };
    const giver: Actor = { ...giverAccount, page: giverSession.page };

    // Playwright's fixture callback parameter is conventionally named `use`,
    // which react-hooks/rules-of-hooks mistakes for React 19's `use()` hook.
    // eslint-disable-next-line react-hooks/rules-of-hooks
    await use({ runId, groupId, owner, giver });

    await ownerSession.context.close();
    await giverSession.context.close();

    // Every step runs, and the first failure is rethrown after the last.
    await deleteAll(teardown);
  },
});

export { expect };
