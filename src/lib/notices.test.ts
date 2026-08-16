import { describe, expect, it } from "vitest";

import { toBuyingItems, type NoticeRow } from "@/lib/notices";
import type { ClaimedWish } from "@/lib/types";

/**
 * "Čo kupujem" is the one screen that tells a buyer their gift was cancelled or
 * changed underneath them. These tests pin down what it says, and in what order
 * — toBuyingItems sorts both halves itself, so the order asserted here is the
 * order the page renders regardless of how the queries feeding it are ordered.
 */

const WISH_ID = "11111111-1111-4111-8111-111111111111";
const OTHER_WISH_ID = "33333333-3333-4333-8333-333333333333";

const claimed: ClaimedWish = {
  id: WISH_ID,
  title: "Lego Technic 42143",
  description: "Červené",
  url: "https://example.com/42143",
  createdAt: "2026-01-01T00:00:00.000Z",
  owner: { id: "22222222-2222-4222-8222-222222222222", name: "Peter" },
  claimedAt: "2026-01-02T00:00:00.000Z",
};

const editedNotice: NoticeRow = {
  id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  kind: "edited",
  owner_name: "Peter",
  wish_id: WISH_ID,
  old_title: "Lego Technic 42115",
  old_description: "Červené",
  old_url: "https://example.com/42143",
  new_title: "Lego Technic 42143",
  new_description: "Červené",
  new_url: "https://example.com/42143",
  created_at: "2026-01-03T00:00:00.000Z",
};

const deletedNotice: NoticeRow = {
  id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  kind: "deleted",
  owner_name: "Peter",
  wish_id: OTHER_WISH_ID,
  old_title: "Slúchadlá Sony",
  old_description: null,
  old_url: "https://example.com/sony",
  new_title: null,
  new_description: null,
  new_url: null,
  created_at: "2026-01-04T00:00:00.000Z",
};

describe("toBuyingItems — a claim nobody touched", () => {
  it("passes the wish through with nothing to dismiss", () => {
    expect(toBuyingItems([claimed], [])).toEqual([
      {
        kind: "active",
        key: WISH_ID,
        wish: claimed,
        ownerName: "Peter",
        change: null,
      },
    ]);
  });
});

describe("toBuyingItems — the owner edited it", () => {
  it("reports only the field that actually moved", () => {
    const [item] = toBuyingItems([claimed], [editedNotice]);

    expect(item).toMatchObject({
      kind: "active",
      change: {
        noticeId: editedNotice.id,
        fields: [
          {
            field: "title",
            before: "Lego Technic 42115",
            after: "Lego Technic 42143",
          },
        ],
      },
    });
  });

  it("reports every changed field, in a stable order", () => {
    const [item] = toBuyingItems(
      [claimed],
      [
        {
          ...editedNotice,
          old_description: "Modré",
          old_url: "https://example.com/old",
        },
      ],
    );

    expect(
      item.kind === "active" && item.change?.fields.map((c) => c.field),
    ).toEqual(["title", "description", "url"]);
  });

  it("keeps the title the buyer reserved, not an intermediate one", () => {
    // Repeat edits coalesce in the database, so `old_*` is always the version
    // that was reserved however many times the owner has since changed it.
    const [item] = toBuyingItems(
      [{ ...claimed, title: "Lego Technic 42151" }],
      [{ ...editedNotice, new_title: "Lego Technic 42151" }],
    );

    expect(item.kind === "active" && item.change?.fields[0]).toEqual({
      field: "title",
      before: "Lego Technic 42115",
      after: "Lego Technic 42151",
    });
  });

  it("invents no change when the notice records none", () => {
    const [item] = toBuyingItems(
      [claimed],
      [
        {
          ...editedNotice,
          old_title: "Lego Technic 42143",
          new_title: "Lego Technic 42143",
        },
      ],
    );

    expect(item).toMatchObject({ kind: "active", change: null });
  });

  it("ignores a notice for a wish that is no longer claimed", () => {
    expect(toBuyingItems([], [editedNotice])).toEqual([]);
  });
});

describe("toBuyingItems — the owner deleted it", () => {
  it("becomes a standalone row built from the notice alone", () => {
    expect(toBuyingItems([], [deletedNotice])).toEqual([
      {
        kind: "cancelled",
        key: deletedNotice.id,
        wish: {
          title: "Slúchadlá Sony",
          description: null,
          url: "https://example.com/sony",
        },
        ownerName: "Peter",
        noticeId: deletedNotice.id,
      },
    ]);
  });

  it("carries no claim information of any kind", () => {
    // The buyer knows who they were buying for. Nothing here should be able to
    // travel back the other way, so a cancelled row holds no claimer and no
    // wish — only a name the buyer already knew.
    const [item] = toBuyingItems([], [deletedNotice]);

    expect(JSON.stringify(item)).not.toMatch(/claim(ed|er)/i);
    expect(Object.keys(item.wish)).toEqual(["title", "description", "url"]);
  });
});

describe("toBuyingItems — ordering", () => {
  it("puts what needs attention above what does not", () => {
    const untouched: ClaimedWish = { ...claimed, id: OTHER_WISH_ID };

    const items = toBuyingItems(
      [claimed, untouched],
      [deletedNotice, editedNotice],
    );

    expect(items.map((item) => item.kind)).toEqual([
      "cancelled",
      "active",
      "active",
    ]);
    expect(items[1]).toMatchObject({ change: { noticeId: editedNotice.id } });
    expect(items[2]).toMatchObject({ change: null });
  });

  it("shows the most recent cancellation first, whatever order it is given", () => {
    const older: NoticeRow = {
      ...deletedNotice,
      id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
      created_at: "2026-01-01T00:00:00.000Z",
      old_title: "Hrnček",
    };

    // Deliberately oldest-first on the way in.
    const items = toBuyingItems([], [older, deletedNotice]);

    expect(
      items.map((item) => item.kind === "cancelled" && item.wish.title),
    ).toEqual(["Slúchadlá Sony", "Hrnček"]);
  });

  it("shows the most recently claimed wish first, whatever order it is given", () => {
    const earlier: ClaimedWish = {
      ...claimed,
      id: OTHER_WISH_ID,
      title: "Hrnček",
      claimedAt: "2026-01-01T00:00:00.000Z",
    };

    const items = toBuyingItems([earlier, claimed], []);

    expect(items.map((item) => item.wish.title)).toEqual([
      "Lego Technic 42143",
      "Hrnček",
    ]);
  });
});
