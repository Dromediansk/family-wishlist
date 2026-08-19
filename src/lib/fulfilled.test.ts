import { describe, expect, it } from "vitest";

import {
  FULFILLED_WISH_COLUMNS,
  toFulfilledWish,
  type FulfilledWishRow,
} from "@/lib/fulfilled";

/**
 * The inverse pin of wishes.test.ts. There, a claimer's name must never survive
 * the mapping; here the giver's name must, because the claim it came from is
 * over. A later tidy-up that strips it should fail loudly.
 * docs/content/privacy-rule.md#when-the-secret-ends
 */

const row: FulfilledWishRow = {
  id: "11111111-1111-4111-8111-111111111111",
  title: "Wool socks",
  description: "Size 42",
  url: "https://example.com/socks",
  owner_name: "Anna",
  giver_name: "Boris",
  fulfilled_at: "2025-12-12T12:00:00.000Z",
};

describe("toFulfilledWish", () => {
  it("carries the wish and both names", () => {
    expect(toFulfilledWish(row)).toEqual({
      id: row.id,
      title: "Wool socks",
      description: "Size 42",
      url: "https://example.com/socks",
      ownerName: "Anna",
      giverName: "Boris",
      fulfilledAt: row.fulfilled_at,
    });
  });

  it("keeps the giver's name — this record is not a secret", () => {
    expect(toFulfilledWish(row).giverName).toBe("Boris");
  });

  it("keeps an absent description and link absent", () => {
    const bare = toFulfilledWish({ ...row, description: null, url: null });

    expect(bare.description).toBeNull();
    expect(bare.url).toBeNull();
  });

  it("selects no claim columns — this table has none to select", () => {
    expect(FULFILLED_WISH_COLUMNS).not.toMatch(/claim/);
  });
});
