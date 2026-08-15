import { describe, expect, it } from "vitest";

import {
  OWNER_WISH_COLUMNS,
  toOwnerWish,
  toViewerWish,
  type ViewerWishRow,
} from "@/lib/wishes";

/**
 * The whole app hinges on one rule: the owner of a list must never learn that
 * one of their wishes has been claimed. These tests pin that down.
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
