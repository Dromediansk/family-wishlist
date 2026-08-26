import { createTranslator } from "next-intl";
import { describe, expect, it } from "vitest";

import en from "../../messages/en.json";
import sk from "../../messages/sk.json";

import { asGroupId, asUserId, type GroupId, type UserId } from "@/lib/ids";
import {
  OWNER_WISH_COLUMNS,
  refusalFor,
  toClaimedWish,
  toOwnerWish,
  toViewerWish,
  wishPhotoUrl,
  type ClaimedWishRow,
  type ViewerWishRow,
} from "@/lib/wishes";

/**
 * The owner of a list must never learn *who* claimed one of their wishes, and
 * a list they are only reading must never carry claim data at all. Refusing a
 * delete or an edit is the one place the owner is told that a wish of theirs is
 * reserved; these tests pin down both halves.
 */

const claimedRow: ViewerWishRow = {
  id: "11111111-1111-4111-8111-111111111111",
  title: "Wool socks",
  description: "Size 42",
  url: "https://example.com/socks",
  photo_path: "11111111-1111-4111-8111-111111111111/abc123.webp",
  created_at: "2026-01-01T00:00:00.000Z",
  claimed_at: "2026-01-02T00:00:00.000Z",
  claimed_by_user_id: asUserId("22222222-2222-4222-8222-222222222222"),
};

// PRIVACY-RULE: pins the owner view, the claimer-name rule and the refusal.
describe("toOwnerWish", () => {
  it("keeps title, description, link and photo", () => {
    expect(toOwnerWish(claimedRow)).toEqual({
      id: claimedRow.id,
      title: "Wool socks",
      description: "Size 42",
      url: "https://example.com/socks",
      photo: claimedRow.photo_path,
      createdAt: claimedRow.created_at,
    });
  });

  it("carries no claim information, even from a fully claimed row", () => {
    const wish = toOwnerWish(claimedRow);
    const keys = Object.keys(wish);

    expect(keys).not.toContain("claim");
    expect(keys).not.toContain("claimed_by_user_id");
    expect(keys).not.toContain("claimed_at");

    // Nothing anywhere in the serialized payload should name the claimer.
    expect(JSON.stringify(wish)).not.toContain(claimedRow.claimed_by_user_id);
  });

  it("selects no claim columns for the owner's query", () => {
    expect(OWNER_WISH_COLUMNS).not.toMatch(/claim/);
  });
});

describe("toViewerWish", () => {
  const ME = asUserId("11111111-1111-4111-8111-111111111111");
  const PEER = asUserId("22222222-2222-4222-8222-222222222222");
  const STRANGER = asUserId("33333333-3333-4333-8333-333333333333");
  const peers = new Set([ME, PEER]);
  // STRANGER has a name here on purpose: without one, a leak would render the
  // "?" fallback and every assertion below would still pass.
  const names = new Map([
    [ME, "Miro"],
    [PEER, "Zuzana"],
    [STRANGER, "Peter"],
  ]);

  function row(claimedBy: UserId | null): ViewerWishRow {
    return {
      id: "44444444-4444-4444-8444-444444444444",
      title: "Kniha",
      description: null,
      url: null,
      photo_path: null,
      created_at: "2026-01-01T00:00:00.000Z",
      claimed_at: claimedBy ? "2026-02-01T00:00:00.000Z" : null,
      claimed_by_user_id: claimedBy,
    };
  }

  it("reports an unclaimed wish as free", () => {
    expect(toViewerWish(row(null), peers, names).claim).toEqual({
      kind: "free",
    });
  });

  it("names a claimer the viewer shares a group with", () => {
    expect(toViewerWish(row(PEER), peers, names).claim).toEqual({
      kind: "taken-by",
      at: "2026-02-01T00:00:00.000Z",
      by: { id: PEER, name: "Zuzana" },
    });
  });

  it("hides the name of a claimer from another group", () => {
    expect(toViewerWish(row(STRANGER), peers, names).claim).toEqual({
      kind: "taken",
      at: "2026-02-01T00:00:00.000Z",
    });
  });

  it("carries no claimer name anywhere in the taken case", () => {
    const view = toViewerWish(row(STRANGER), peers, names);
    const serialized = JSON.stringify(view);

    expect(serialized).not.toContain(STRANGER);
    expect(serialized).not.toContain("Peter");
    expect(view.claim.kind).toBe("taken");
    // The union has no `by` outside `taken-by`; this is the runtime half of it.
    expect("by" in view.claim).toBe(false);
  });

  it("treats a claim with no timestamp as free", () => {
    const broken = { ...row(PEER), claimed_at: null };
    expect(toViewerWish(broken, peers, names).claim).toEqual({ kind: "free" });
  });
});

describe("toClaimedWish", () => {
  const OWNER = asUserId("33333333-3333-4333-8333-333333333333");
  const FAMILY = asGroupId("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa");
  const WORK = asGroupId("bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb");

  const row: ClaimedWishRow = {
    id: "44444444-4444-4444-8444-444444444444",
    title: "Wool socks",
    description: null,
    url: null,
    photo_path: null,
    created_at: "2026-01-01T00:00:00.000Z",
    owner_user_id: OWNER,
  };

  const names = new Map<UserId, string>([[OWNER, "Zuzana"]]);
  const shared = (...groups: GroupId[]) =>
    new Map<UserId, ReadonlySet<GroupId>>([[OWNER, new Set(groups)]]);

  it("names the owner and keeps the tags they share with the viewer", () => {
    const wish = toClaimedWish(
      row,
      names,
      [FAMILY, WORK],
      shared(FAMILY, WORK),
    );
    expect(wish.owner).toEqual({ id: OWNER, name: "Zuzana" });
    expect(wish.groupIds).toEqual([FAMILY, WORK]);
  });

  it("drops a tag naming a group the two no longer share", () => {
    // Tagged for both; the owner has since left WORK, and nothing pruned the
    // tag behind them. Saying "Kolegovia" here would assert a dead membership.
    expect(
      toClaimedWish(row, names, [FAMILY, WORK], shared(FAMILY)).groupIds,
    ).toEqual([FAMILY]);
  });

  it("names nothing when no tag survives the narrowing", () => {
    expect(toClaimedWish(row, names, [WORK], shared(FAMILY)).groupIds).toEqual(
      [],
    );
  });

  it("names nothing for an owner the viewer shares no group with", () => {
    expect(toClaimedWish(row, names, [FAMILY], new Map()).groupIds).toEqual([]);
  });

  it("carries no claim field to leak", () => {
    expect(
      toClaimedWish(row, names, [FAMILY], shared(FAMILY)),
    ).not.toHaveProperty("claim");
  });

  it("falls back to ? for an owner with no name in any shared group", () => {
    expect(
      toClaimedWish(row, new Map(), [FAMILY], shared(FAMILY)).owner.name,
    ).toBe("?");
  });
});

describe("refusalFor", () => {
  const claimerId = "22222222-2222-4222-8222-222222222222";
  const reserved = { claimed_by_user_id: claimerId };
  const free = { claimed_by_user_id: null };

  it("picks the reserved wording for a wish somebody holds", () => {
    expect(refusalFor(reserved, "delete").key).toBe("deleteReserved");
    expect(refusalFor(reserved, "update").key).toBe("updateReserved");
  });

  it("falls back to the ownership wording for a row that is not reserved", () => {
    // Unreserved and unmatched are the same answer: whatever went wrong, it was
    // not a claim, so the owner learns nothing about claims either way.
    expect(refusalFor(free, "delete").key).toBe("deleteNotYours");
    expect(refusalFor(free, "update").key).toBe("updateNotYours");
  });

  it("falls back to the same wording when nothing matched at all", () => {
    expect(refusalFor(null, "delete").key).toBe("deleteNotYours");
    expect(refusalFor(null, "update").key).toBe("updateNotYours");
  });

  it("marks a refusal final, so no dialog offers a retry that cannot work", () => {
    expect(refusalFor(reserved, "delete").final).toBe(true);
    expect(refusalFor(null, "update").final).toBe(true);
  });

  /*
   * PRIVACY-RULE: the refusal an owner reads when a reserved wish will not
   * budge must say that it is reserved and never by whom — in every language
   * the app has. Rendering the real catalogues is what makes a careless
   * translation fail here rather than in front of an owner.
   */
  it("never names the holder, in any language", () => {
    for (const [locale, messages] of [
      ["sk", sk],
      ["en", en],
    ] as const) {
      const t = createTranslator({ locale, messages, namespace: "errors" });
      for (const operation of ["delete", "update"] as const) {
        const sentence = t(refusalFor(reserved, operation).key);
        expect(sentence).not.toContain(claimerId);
        expect(sentence.trim()).not.toBe("");
      }
    }
  });
});

describe("wishPhotoUrl", () => {
  const wish = { id: "11111111-1111-4111-8111-111111111111", photo: null };

  it("addresses the route by wish id, never by object key", () => {
    const url = wishPhotoUrl({ ...wish, photo: `${wish.id}/abc123.webp` });

    expect(url).toBe(`/wish-photo/${wish.id}?v=abc123`);
    expect(url).not.toContain(".webp");
  });

  it("has no URL for a wish without a photo", () => {
    expect(wishPhotoUrl(wish)).toBeNull();
  });

  it("changes when the photo does, so a cached one is never shown", () => {
    const before = wishPhotoUrl({ ...wish, photo: `${wish.id}/aaa.webp` });
    const after = wishPhotoUrl({ ...wish, photo: `${wish.id}/bbb.webp` });

    expect(before).not.toBe(after);
  });
});

