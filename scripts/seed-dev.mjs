/**
 * Fills the LOCAL database with a fake family, inside its own group.
 *
 *   npm run db:seed
 *
 * Run it after signing in; the loop is db:reset → sign in → db:seed, and the middle step
 * cannot be skipped. Re-running is safe — the seed group and every fake member carry an
 * @seed.local email and are deleted first.
 *
 * docs/setup/local-development.md#resetting-and-seeding
 */

import { createClient } from "@supabase/supabase-js";

/** Defined first: the two checks below run at import time. */
const fail = (message) => {
  console.error(`\n${message}\n`);
  process.exit(1);
};

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  fail(
    "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must both be set.\n" +
      "They are committed in .env.development, so this most likely means that file was\n" +
      "emptied or is being overridden — check .env.development.local and your shell.",
  );
}

/**
 * The guardrail. This writes fabricated data with a key that bypasses RLS, so it has to be
 * *incapable* of reaching the hosted project, not merely unlikely to.
 */
const LOOPBACK = new Set(["127.0.0.1", "localhost", "::1", "[::1]"]);
const host = new URL(url).hostname;
if (!LOOPBACK.has(host)) {
  fail(
    `Refusing to seed ${host} — this only ever runs against the local stack.\n` +
      "NEXT_PUBLIC_SUPABASE_URL is pointing somewhere that is not loopback, so something\n" +
      "is outranking .env.development — a .env.development.local, or your shell.",
  );
}

const db = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const SEED_DOMAIN = "@seed.local";

/**
 * Distinct from every group a person might make by hand ("Naša rodina", "Testovacia
 * rodina", …). Looked up scoped to `created_by`, so the name alone need not be globally
 * unique — but picking one that is not already in use keeps it recognisable at a glance.
 */
const GROUP_NAME = "Vzorová rodina";

/** Slovak, like the rest of the UI. */
const RELATIVES = ["Zuzana", "Marek", "Elena"];

/**
 * Your own list. Two of these get claimed below, and you must not be able to tell which.
 *
 * Declared up here because these are the one set of rows the cleanup cannot get for free:
 * they hang off your own account, so no cascade reaches them and they go by title.
 */
const MY_WISHES = [
  { title: "Bezdrôtové slúchadlá", url: "https://example.com/sluchadla" },
  { title: "Kniha o architektúre", description: "Najradšej niečo o Bauhause." },
  { title: "Espresso šálky", description: "Sada štyroch." },
  { title: "Turistické ponožky" },
];

const main = async () => {
  const me = await findAnchor();
  console.log(`Anchoring on ${me.name} <${me.email ?? "no email"}>.`);

  await clearPreviousSeed(me);

  const groupId = await insertGroup(me);
  const [zuzana, marek, elena] = await insertRelatives(groupId);

  const mine = await insertWishes(me.id, MY_WISHES);

  const hers = await insertWishes(zuzana.id, [
    { title: "Keramická váza", description: "Vysoká, matná, ideálne zelená." },
    { title: "Poukaz do kníhkupectva", url: "https://example.com/poukaz" },
    { title: "Vlnená deka" },
  ]);

  const his = await insertWishes(marek.id, [
    { title: "Sada skrutkovačov", url: "https://example.com/skrutkovace" },
    { title: "Termoska" },
  ]);

  await insertWishes(elena.id, [
    { title: "Akvarelové farby", description: "24 odtieňov stačí." },
    { title: "Stojan na maľovanie" },
  ]);

  // You are buying for other people. These show up under /buying, across two lists.
  await claim(hers[0].id, me.id);
  await claim(hers[1].id, me.id);
  await claim(his[0].id, me.id);

  // Other people are buying for you. The point of the exercise: none of this may be
  // visible on your own list, and your own card must show a bare total rather than
  // "free / total". The first and the third are the ones the owner cannot delete or
  // edit — everything the app will tell you about them is that they are reserved.
  await claim(mine[0].id, zuzana.id);
  await claim(mine[2].id, marek.id);

  await report(me, groupId);
};

/**
 * The one account with a real sign-in: you. Everything else — the group, its
 * memberships, its wishes — hangs off this row, and there is no sensible fallback if it
 * is missing: a seed that invented it would be inventing the sign-in that
 * handle_new_auth_user() is supposed to perform.
 *
 * Several people may have signed in on this stack by now (earlier fixtures leave their
 * own accounts behind); the earliest by created_at is the deterministic pick.
 */
const findAnchor = async () => {
  const { data, error } = await db
    .from("app_users")
    .select("id, name, email")
    .not("auth_user_id", "is", null)
    .order("created_at", { ascending: true })
    .limit(1);

  if (error) throw error;

  if (!data.length) {
    fail(
      "No signed-in account found.\n\n" +
        "Sign in with Google at http://localhost:3000 first — that is what creates your\n" +
        "app_users row. Then run this again.",
    );
  }

  return data[0];
};

/**
 * Back to a known state, in three parts — because only the first two are free.
 *
 * Deleting the seed group takes its memberships with it (ON DELETE CASCADE), including
 * yours in that group. Deleting the fake app_users rows takes their wishes with them
 * (ON DELETE CASCADE) and releases anything they had claimed elsewhere (ON DELETE SET
 * NULL, with clear_claim_timestamp keeping claim_consistent true). Your own account is
 * untouched by either, so the wishes this script put on *your* list have to go by title.
 */
const clearPreviousSeed = async (me) => {
  const { data: groups, error: groupError } = await db
    .from("groups")
    .delete()
    .eq("created_by", me.id)
    .eq("name", GROUP_NAME)
    .select("id");

  if (groupError) throw groupError;

  const { data: relatives, error: relativesError } = await db
    .from("app_users")
    .delete()
    .like("email", `%${SEED_DOMAIN}`)
    .select("id");

  if (relativesError) throw relativesError;

  const { data: wishes, error: wishError } = await db
    .from("wishes")
    .delete()
    .eq("owner_user_id", me.id)
    .in(
      "title",
      MY_WISHES.map((w) => w.title),
    )
    .select("id");

  if (wishError) throw wishError;

  const removed = [
    groups.length && "the seed group",
    relatives.length && `${relatives.length} fake member(s)`,
    wishes.length && `${wishes.length} of your wishes`,
  ].filter(Boolean);

  if (removed.length) console.log(`Cleared from a previous seed: ${removed.join(", ")}.`);
};

/**
 * The group everything else lives in, with you as its admin. `created_by` is an
 * app_users id — never a membership id, the other column with this name.
 * docs/content/groups.md#the-creation-cap
 */
const insertGroup = async (me) => {
  const { data, error } = await db
    .from("groups")
    .insert({ name: GROUP_NAME, created_by: me.id })
    .select("id");

  if (error) throw error;
  if (!data.length) fail("Inserted group did not come back from the database.");

  const groupId = data[0].id;

  const { error: membershipError } = await db.from("memberships").insert({
    group_id: groupId,
    user_id: me.id,
    name: me.name,
    role: "admin",
  });

  if (membershipError) throw membershipError;

  return groupId;
};

/**
 * Insert order is not guaranteed to come back in order, so both inserts below put the
 * returned rows back in the order they were asked for, keyed on a column unique within
 * the batch. A miss stops here rather than three lines later as `undefined.id`.
 */
const inAskedOrder = (rows, keys, column) =>
  keys.map((key) => {
    const row = rows.find((r) => r[column] === key);
    if (!row) {
      fail(`Inserted ${column} '${key}' did not come back from the database.`);
    }
    return row;
  });

/**
 * The fake people. They get an app_users row with no auth_user_id — they can never sign
 * in, which is the point — and a member membership in the seed group.
 */
const insertRelatives = async (groupId) => {
  const { data, error } = await db
    .from("app_users")
    .insert(
      RELATIVES.map((name) => ({
        name,
        email: `${name.toLowerCase()}${SEED_DOMAIN}`,
      })),
    )
    .select("id, name");

  if (error) throw error;
  const relatives = inAskedOrder(data, RELATIVES, "name");

  const { error: membershipError } = await db.from("memberships").insert(
    relatives.map((r) => ({
      group_id: groupId,
      user_id: r.id,
      name: r.name,
      role: "member",
    })),
  );

  if (membershipError) throw membershipError;

  return relatives;
};

const insertWishes = async (ownerId, wishes) => {
  const { data, error } = await db
    .from("wishes")
    .insert(wishes.map((w) => ({ owner_user_id: ownerId, ...w })))
    .select("id, title");

  if (error) throw error;
  return inAskedOrder(
    data,
    wishes.map((w) => w.title),
    "title",
  );
};

/** claimed_by_user_id and claimed_at are set together — claim_consistent in 0001_init.sql. */
const claim = async (wishId, claimerId) => {
  const { error } = await db
    .from("wishes")
    .update({ claimed_by_user_id: claimerId, claimed_at: new Date().toISOString() })
    .eq("id", wishId);

  if (error) throw error;
};

const report = async (me, groupId) => {
  const counts = await Promise.all(
    ["app_users", "groups", "memberships", "wishes"].map(async (table) => {
      const { count, error } = await db.from(table).select("*", { count: "exact", head: true });
      if (error) throw error;
      return `${count} ${table}`;
    }),
  );

  // Whole-table counts, not "rows this run inserted" — anything you added by hand is in
  // here too, which is the number you actually want when checking what a page renders.
  console.log(`\nThe database now holds ${counts.join(", ")}.`);
  console.log(
    [
      "",
      "Worth looking at, signed in as " + me.name + ":",
      `  /g/${groupId} — your own card shows a bare total, not free / total.`,
      "                 Two of your four wishes are claimed and none of them says so.",
      "                 Open Zuzana's, Marek's or Elena's list from there: the bin refuses two",
      "                 of your own four with 'už má niekto rezervované', and one of Zuzana's",
      "                 wishes is claimed by you and says so.",
      "  /buying      — three claims, across two lists.",
    ].join("\n"),
  );
};

main().catch((error) => {
  console.error("\nSeeding failed:", error.message ?? error);
  process.exit(1);
});
