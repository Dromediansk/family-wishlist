import { describe, expect, it } from "vitest";

import {
  OWNER_WISH_COLUMNS,
  refusalFor,
  toOwnerWish,
  toViewerWish,
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
  created_at: "2026-01-01T00:00:00.000Z",
  claimed_at: "2026-01-02T00:00:00.000Z",
  claimer: { id: "22222222-2222-4222-8222-222222222222", name: "Anna" },
};

describe("toOwnerWish", () => {
  it("keeps title, description and link", () => {
    expect(toOwnerWish(claimedRow)).toEqual({
      id: claimedRow.id,
      title: "Wool socks",
      description: "Size 42",
      url: "https://example.com/socks",
      createdAt: claimedRow.created_at,
    });
  });

  it("carries no claim information, even from a fully claimed row", () => {
    const wish = toOwnerWish(claimedRow);
    const keys = Object.keys(wish);

    expect(keys).not.toContain("claimedBy");
    expect(keys).not.toContain("claimedAt");
    expect(keys).not.toContain("claimer");
    expect(keys).not.toContain("claimed_by");
    expect(keys).not.toContain("claimed_at");

    // Nothing anywhere in the serialized payload should name the claimer.
    expect(JSON.stringify(wish)).not.toContain("Anna");
  });

  it("selects no claim columns for the owner's query", () => {
    expect(OWNER_WISH_COLUMNS).not.toMatch(/claim/);
  });
});

describe("toViewerWish", () => {
  it("exposes who claimed the item to everyone who is not the owner", () => {
    expect(toViewerWish(claimedRow)).toEqual({
      id: claimedRow.id,
      title: "Wool socks",
      description: "Size 42",
      url: "https://example.com/socks",
      createdAt: claimedRow.created_at,
      claimedBy: {
        id: "22222222-2222-4222-8222-222222222222",
        name: "Anna",
      },
      claimedAt: claimedRow.claimed_at,
    });
  });

  it("reports an unclaimed item as available", () => {
    const wish = toViewerWish({
      ...claimedRow,
      claimed_at: null,
      claimer: null,
    });

    expect(wish.claimedBy).toBeNull();
    expect(wish.claimedAt).toBeNull();
  });

  it("normalizes an embedded relation returned as an array", () => {
    const wish = toViewerWish({
      ...claimedRow,
      claimer: [{ id: "22222222-2222-4222-8222-222222222222", name: "Anna" }],
    });

    expect(wish.claimedBy?.name).toBe("Anna");
  });

  it("treats a missing claimer as unclaimed even if claimed_at lingers", () => {
    const wish = toViewerWish({ ...claimedRow, claimer: [] });

    expect(wish.claimedBy).toBeNull();
    expect(wish.claimedAt).toBeNull();
  });
});

describe("refusalFor", () => {
  const claimerId = "22222222-2222-4222-8222-222222222222";
  const reserved = { claimed_by: claimerId };
  const free = { claimed_by: null };

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
