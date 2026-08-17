/**
 * Fills the LOCAL database with a fake family, so the interesting states can be looked at
 * instead of clicked into existence.
 *
 *   npm run db:seed
 *
 * Run it after signing in — see supabase/seed.sql for why the fake members cannot be
 * created before that. The full loop is: db:reset → sign in with Google → db:seed.
 *
 * Re-running is safe. Every seeded member carries an @seed.local email, and the first
 * thing this does is delete them; their wishes go with them via ON DELETE CASCADE, and
 * anything they had claimed is released by ON DELETE SET NULL plus the
 * clear_claim_timestamp trigger. Your own account and anything you added by hand survive.
 *
 * Claim notices are not inserted. They are provoked — by editing and deleting wishes that
 * are already claimed — so what ends up in the table is whatever the triggers in
 * 0004_claim_notices.sql actually write, not a guess at it.
 */

import { createClient } from "@supabase/supabase-js";

/**
 * Every giving-up path in this file. Defined first because the two checks below run at
 * import time, before anything else exists.
 */
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
 * The guardrail. This script writes fabricated data with a key that bypasses row level
 * security, so it has to be incapable of reaching the hosted project — not merely
 * unlikely to. A hostname check is the one thing that cannot be got wrong by editing the
 * wrong dotenv file.
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
 * Your own list. Two of these get claimed below — by design you must not be able to tell
 * which, and that is the thing worth looking at after this runs.
 *
 * Declared up here rather than inline because these are the one set of rows the cleanup
 * cannot get for free: they hang off your account, not off a seeded member, so no cascade
 * reaches them and they have to be removed by title.
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

  // You are buying for other people. These show up under /buying.
  //
  // Three, not two: the notices below can only be provoked on a wish somebody already
  // holds — both triggers carry `when (old.claimed_by is not null)` — so the wish that
  // gets rewritten and the wish that gets deleted have to be claimed here first.
  await claim(hers[0].id, me.id);
  await claim(hers[1].id, me.id);
  await claim(his[0].id, me.id);

  // Other people are buying for you. The point of the exercise: none of this may be
  // visible on your own list, and your own card must show a bare total rather than
  // "free / total".
  await claim(mine[0].id, zuzana.id);
  await claim(mine[2].id, marek.id);

  // Now provoke the two claim notices, by doing to a claimed wish exactly what an
  // unwitting owner would do to it.
  await editAsOwner(hers[1].id, me.id, {
    title: "Poukaz do kníhkupectva (radšej do papiernictva)",
    url: "https://example.com/papiernictvo",
  });
  await deleteAsOwner(his[0].id, me.id);

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
 * Back to a known state, in three parts — because only the first of them is free.
 *
 * Deleting the seeded members takes their wishes with them (ON DELETE CASCADE) and
 * releases anything they had claimed (ON DELETE SET NULL, with clear_claim_timestamp
 * keeping claim_consistent true). Your own rows are untouched by that, so the wishes this
 * script put on *your* list have to go by title, and the notices addressed to you have to
 * go explicitly — claim_notices.wish_id is deliberately not a foreign key, so nothing
 * collects them when the wish they describe disappears.
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

  // Every notice addressed to you, including any you provoked by hand — this script
  // produces a known state, not a merge with whatever was there before. Nothing else
  // collects them: claim_notices.wish_id is deliberately not a foreign key, so notices
  // outlive the wishes and members they describe.
  const { data: notices, error: noticeError } = await db
    .from("claim_notices")
    .delete()
    .eq("claimer_id", me.id)
    .select("id");

  if (noticeError) throw noticeError;

  const removed = [
    members.length && `${members.length} member(s)`,
    wishes.length && `${wishes.length} of your wishes`,
    notices.length && `${notices.length} notice(s)`,
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

/**
 * The owner rewrites something that is already reserved, knowing nothing about the claim.
 * wishes_notice_edited turns that into a "bolo … → teraz …" row for whoever holds it.
 */
const editAsOwner = async (wishId, expectedClaimer, changes) => {
  const { error } = await db.from("wishes").update(changes).eq("id", wishId);
  if (error) throw error;
  await expectNotice(wishId, expectedClaimer, "edited");
};

/** Same idea, for wishes_notice_deleted. The wish is gone; the notice is not. */
const deleteAsOwner = async (wishId, expectedClaimer) => {
  const { error } = await db.from("wishes").delete().eq("id", wishId);
  if (error) throw error;
  await expectNotice(wishId, expectedClaimer, "deleted");
};

/**
 * The notices are the whole reason those two writes happen, so a silent trigger is a
 * failed seed rather than a cosmetic problem. Better to say so here than to leave an
 * empty /buying page looking like a bug in the page.
 */
const expectNotice = async (wishId, claimerId, kind) => {
  const { data, error } = await db
    .from("claim_notices")
    .select("id")
    .eq("wish_id", wishId)
    .eq("claimer_id", claimerId)
    .eq("kind", kind);

  if (error) throw error;
  if (!data.length) {
    fail(
      `Expected a '${kind}' claim notice for wish ${wishId} and none was written.\n` +
        "The triggers from 0004_claim_notices.sql are missing or did not fire — check\n" +
        "`npm run db:reset` output for a migration that failed.",
    );
  }
};

const report = async (me) => {
  const counts = await Promise.all(
    ["family_members", "wishes", "claim_notices"].map(async (table) => {
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
      "  /member/<Zuzana>  — one of hers is claimed by you, and it says so.",
      "  /buying           — two claims, plus an edited and a deleted notice.",
    ].join("\n"),
  );
};

main().catch((error) => {
  console.error("\nSeeding failed:", error.message ?? error);
  process.exit(1);
});
