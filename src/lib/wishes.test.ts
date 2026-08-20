import { describe, expect, it } from "vitest";

import { asUserId, type UserId } from "@/lib/ids";
import {
  OWNER_WISH_COLUMNS,
  refusalFor,
  toOwnerWish,
  toViewerWish,
  wishPhotoUrl,
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
  const names = new Map([
    [ME, "Miro"],
    [PEER, "Zuzana"],
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
    expect(JSON.stringify(view)).not.toContain(STRANGER);
  });

  it("treats a claim with no timestamp as free", () => {
    const broken = { ...row(PEER), claimed_at: null };
    expect(toViewerWish(broken, peers, names).claim).toEqual({ kind: "free" });
  });
});

describe("refusalFor", () => {
  const claimerId = "22222222-2222-4222-8222-222222222222";
  const reserved = { claimed_by_user_id: claimerId };
  const free = { claimed_by_user_id: null };

  it("says the wish is reserved when deleting one somebody holds", () => {
    expect(refusalFor(reserved, "delete").error).toBe(
      "Toto želanie už má niekto rezervované, preto ho nemôžeš vymazať.",
    );
  });

  it("says the same when editing one somebody holds", () => {
    expect(refusalFor(reserved, "update").error).toBe(
      "Toto želanie už má niekto rezervované, preto ho nemôžeš upraviť.",
    );
  });

  it("never names the person holding it", () => {
    expect(refusalFor(reserved, "delete").error).not.toContain(claimerId);
    expect(refusalFor(reserved, "update").error).not.toContain(claimerId);
  });

  it("falls back to the ownership message for a row that is not reserved", () => {
    // Unreserved and unmatched are the same answer: whatever went wrong, it was
    // not a claim, so the owner learns nothing about claims either way.
    expect(refusalFor(free, "delete").error).toBe(
      "Mazať môžeš len vlastné želania.",
    );
    expect(refusalFor(free, "update").error).toBe(
      "Upravovať môžeš len vlastné želania.",
    );
  });

  it("falls back to the same message when nothing matched at all", () => {
    expect(refusalFor(null, "delete").error).toBe(
      "Mazať môžeš len vlastné želania.",
    );
    expect(refusalFor(null, "update").error).toBe(
      "Upravovať môžeš len vlastné želania.",
    );
  });

  it("marks a refusal final, so no dialog offers a retry that cannot work", () => {
    expect(refusalFor(reserved, "delete").final).toBe(true);
    expect(refusalFor(null, "update").final).toBe(true);
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
