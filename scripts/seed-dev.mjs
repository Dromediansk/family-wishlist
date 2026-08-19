/**
 * Fills the LOCAL database with a fake family.
 *
 *   npm run db:seed
 *
 * Run it after signing in; the loop is db:reset → sign in → db:seed, and the middle step
 * cannot be skipped. Re-running is safe — every seeded member carries an @seed.local
 * email and is deleted first.
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

/** Slovak, like the rest of the UI. */
const RELATIVES = ["Zuzana", "Marek", "Elena"];

/**
 * Your own list. Two of these get claimed below, and you must not be able to tell which.
 *
 * Declared up here because these are the one set of rows the cleanup cannot get for free:
 * they hang off your account, so no cascade reaches them and they go by title.
 */
const MY_WISHES = [
  { title: "Bezdrôtové slúchadlá", url: "https://example.com/sluchadla" },
  { title: "Kniha o architektúre", description: "Najradšej niečo o Bauhause." },
  { title: "Espresso šálky", description: "Sada štyroch." },
  { title: "Turistické ponožky" },
];

const main = async () => {
  const me = await findAnchor();
  console.log(`Anchoring on ${me.name} <${me.email ?? "no email"}> (${me.role}).`);

  await clearPreviousSeed(me);

  const [zuzana, marek, elena] = await insertRelatives();

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

  await report(me);
};

/**
 * The one member with a real account: you. Everything else hangs off this row, and there
 * is no sensible fallback if it is missing — a seed that invented it would be inventing
 * the admin bootstrap that 0003_auth.sql is supposed to perform.
 */
const findAnchor = async () => {
  const { data, error } = await db
    .from("family_members")
    .select("id, name, email, role, status")
    .not("auth_user_id", "is", null)
    .order("created_at", { ascending: true });

  if (error) throw error;

  if (!data.length) {
    fail(
      "No signed-in member found.\n\n" +
        "Sign in with Google at http://localhost:3000 first — that is what creates your\n" +
        "member row, and the first one ever created becomes the admin. Then run this again.\n" +
        "See supabase/seed.sql for the long version.",
    );
  }

  const active = data.find((m) => m.status === "active") ?? data[0];
  if (active.status !== "active") {
    fail(
      `${active.name} is still '${active.status}'. That means a family_members row already\n` +
        "existed when you signed in, so the is_first bootstrap did not fire. Run\n" +
        "`npm run db:reset` and sign in again before seeding.",
    );
  }
  return active;
};

/**
 * Back to a known state, in two parts — because only the first of them is free.
 *
 * Deleting the seeded members takes their wishes with them (ON DELETE CASCADE) and
 * releases anything they had claimed (ON DELETE SET NULL, with clear_claim_timestamp
 * keeping claim_consistent true). Your own rows are untouched by that, so the wishes this
 * script put on *your* list have to go by title.
 */
const clearPreviousSeed = async (me) => {
  const { data: members, error } = await db
    .from("family_members")
    .delete()
    .like("email", `%${SEED_DOMAIN}`)
    .select("id");

  if (error) throw error;

  const { data: wishes, error: wishError } = await db
    .from("wishes")
    .delete()
    .eq("member_id", me.id)
    .in(
      "title",
      MY_WISHES.map((w) => w.title),
    )
    .select("id");

  if (wishError) throw wishError;

  const removed = [
    members.length && `${members.length} member(s)`,
    wishes.length && `${wishes.length} of your wishes`,
  ].filter(Boolean);

  if (removed.length) console.log(`Cleared from a previous seed: ${removed.join(", ")}.`);
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

const insertRelatives = async () => {
  const { data, error } = await db
    .from("family_members")
    .insert(
      RELATIVES.map((name) => ({
        name,
        email: `${name.toLowerCase()}${SEED_DOMAIN}`,
        role: "member",
        status: "active",
        auth_user_id: null,
      })),
    )
    .select("id, name");

  if (error) throw error;
  return inAskedOrder(data, RELATIVES, "name");
};

const insertWishes = async (memberId, wishes) => {
  const { data, error } = await db
    .from("wishes")
    .insert(wishes.map((w) => ({ member_id: memberId, ...w })))
    .select("id, title");

  if (error) throw error;
  return inAskedOrder(
    data,
    wishes.map((w) => w.title),
    "title",
  );
};

/** claimed_by and claimed_at are set together — claim_consistent in 0001_init.sql. */
const claim = async (wishId, claimerId) => {
  const { error } = await db
    .from("wishes")
    .update({ claimed_by: claimerId, claimed_at: new Date().toISOString() })
    .eq("id", wishId);

  if (error) throw error;
};

const report = async (me) => {
  const counts = await Promise.all(
    ["family_members", "wishes"].map(async (table) => {
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
      "  /                 — your own card shows a bare total, not free / total.",
      "                      Two of your four wishes are claimed and none of them says so.",
      "  /member/<you>     — try the bin on each of your four. Two are refused with",
      "                      'už má niekto rezervované'; the same goes for editing them.",
      "  /member/<Zuzana>  — one of hers is claimed by you, and it says so.",
      "  /buying           — three claims, across two lists.",
    ].join("\n"),
  );
};

main().catch((error) => {
  console.error("\nSeeding failed:", error.message ?? error);
  process.exit(1);
});
