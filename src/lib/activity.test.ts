import { describe, expect, it } from "vitest";

import {
  ACTIVITY_LIMIT,
  activityFloor,
  activityKey,
  activityWindowStart,
  countUnseen,
  labelGroup,
  mergeActivity,
  toAddedActivity,
  toClaimActivity,
} from "@/lib/activity";
import { asGroupId, asUserId } from "@/lib/ids";
import type { ActivityItem, GroupRef } from "@/lib/types";

const ZUZANA = asUserId("11111111-1111-4111-8111-111111111111");
const PETER = asUserId("22222222-2222-4222-8222-222222222222");
const STRANGER = asUserId("33333333-3333-4333-8333-333333333333");

const RODINA: GroupRef = {
  id: asGroupId("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"),
  name: "Rodina",
  role: "member",
};
const PRACA: GroupRef = {
  id: asGroupId("bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"),
  name: "Práca",
  role: "member",
};

const NAMES = new Map([
  [ZUZANA, "Zuzana"],
  [PETER, "Peter"],
]);

function item(at: string, title = "Bicykel"): ActivityItem {
  return {
    kind: "wish-added",
    at,
    wishId: at,
    title,
    owner: { id: ZUZANA, name: "Zuzana" },
    group: RODINA,
  };
}

const NOW = new Date("2026-09-16T12:00:00.000Z");
/** Derived, so retuning ACTIVITY_WINDOW_DAYS moves every case below with it. */
const WINDOW_START = activityWindowStart(NOW);

describe("activityWindowStart", () => {
  it("looks back thirty days", () => {
    expect(activityWindowStart(NOW)).toBe("2026-08-17T12:00:00.000Z");
  });
});

describe("activityFloor", () => {
  it("holds at the reader's arrival when that is inside the window", () => {
    expect(activityFloor(WINDOW_START, "2026-09-10T08:00:00.000Z")).toBe(
      Date.parse("2026-09-10T08:00:00.000Z"),
    );
  });

  it("falls back to the window when the reader arrived before it", () => {
    expect(activityFloor(WINDOW_START, "2026-05-01T08:00:00.000Z")).toBe(
      Date.parse(WINDOW_START),
    );
  });

  it("keeps the window when the two coincide", () => {
    expect(activityFloor(WINDOW_START, WINDOW_START)).toBe(
      Date.parse(WINDOW_START),
    );
  });

  // Postgres hands back `+02:00` where `toISOString` writes `Z`; both sides are
  // parsed to instants, so the two spellings cannot drift apart.
  it("reads an offset the column was written with", () => {
    expect(activityFloor(WINDOW_START, "2026-09-10T10:00:00+02:00")).toBe(
      Date.parse("2026-09-10T08:00:00.000Z"),
    );
  });
});

describe("labelGroup", () => {
  it("picks the first shared group in the viewer's own order", () => {
    expect(
      labelGroup(
        [PRACA.id, RODINA.id],
        new Set([PRACA.id, RODINA.id]),
        [RODINA, PRACA],
      ),
    ).toEqual(RODINA);
  });

  it("drops a tag naming a group the owner has since left", () => {
    expect(labelGroup([PRACA.id], new Set([RODINA.id]), [RODINA, PRACA])).toBe(
      null,
    );
  });

  it("drops a tag naming a group the viewer is not in", () => {
    expect(labelGroup([PRACA.id], new Set([PRACA.id]), [RODINA])).toBe(null);
  });
});

describe("toAddedActivity", () => {
  it("names the owner through the labelled group", () => {
    const result = toAddedActivity(
      {
        id: "wish-1",
        title: "Bicykel",
        owner_user_id: ZUZANA,
        created_at: "2026-09-15T10:00:00.000Z",
      },
      NAMES,
      RODINA,
    );

    expect(result).toEqual({
      kind: "wish-added",
      at: "2026-09-15T10:00:00.000Z",
      wishId: "wish-1",
      title: "Bicykel",
      owner: { id: ZUZANA, name: "Zuzana" },
      group: RODINA,
    });
  });
});

describe("toClaimActivity", () => {
  const row = {
    id: "wish-1",
    title: "Bicykel",
    owner_user_id: ZUZANA,
    claimed_by_user_id: PETER,
    claimed_at: "2026-09-15T10:00:00.000Z",
  };

  it("PRIVACY-RULE: never builds an item from the viewer's own wish", () => {
    expect(
      toClaimActivity(row, ZUZANA, new Set([ZUZANA, PETER]), NAMES, RODINA),
    ).toBe(null);
  });

  it("names the claimer to a reader who shares a group with them", () => {
    const result = toClaimActivity(
      row,
      STRANGER,
      new Set([STRANGER, ZUZANA, PETER]),
      NAMES,
      RODINA,
    );

    expect(result).toMatchObject({
      kind: "wish-claimed",
      at: "2026-09-15T10:00:00.000Z",
      claimer: { id: PETER, name: "Peter" },
    });
  });

  it("reports the claim but not the claimer to a reader who shares no group with them", () => {
    const result = toClaimActivity(
      row,
      STRANGER,
      new Set([STRANGER, ZUZANA]),
      NAMES,
      RODINA,
    );

    expect(result).toMatchObject({ kind: "wish-claimed", claimer: null });
  });

  it("says nothing about the viewer's own claim", () => {
    expect(
      toClaimActivity(row, PETER, new Set([PETER, ZUZANA]), NAMES, RODINA),
    ).toBe(null);
  });

  it("ignores a row whose claim has since been released", () => {
    expect(
      toClaimActivity(
        { ...row, claimed_by_user_id: null, claimed_at: null },
        STRANGER,
        new Set([STRANGER, ZUZANA]),
        NAMES,
        RODINA,
      ),
    ).toBe(null);
  });
});

describe("mergeActivity", () => {
  /** Older than every fixture above, so only the floor cases below feel it. */
  const OPEN = Date.parse("2026-01-01T00:00:00.000Z");

  it("orders every source together, newest first", () => {
    const merged = mergeActivity(
      [
        [item("2026-09-10T00:00:00.000Z", "stary")],
        [item("2026-09-15T00:00:00.000Z", "novy")],
        [item("2026-09-12T00:00:00.000Z", "stredny")],
      ],
      OPEN,
    );

    // Narrowed because the union's `member-joined` variant has no title.
    const titles = merged.map((row) =>
      row.kind === "wish-added" ? row.title : null,
    );

    expect(titles).toEqual(["novy", "stredny", "stary"]);
  });

  it("drops the nulls the mappers hand back", () => {
    expect(
      mergeActivity([[item("2026-09-10T00:00:00.000Z"), null]], OPEN),
    ).toHaveLength(1);
  });

  it("keeps the newest ACTIVITY_LIMIT, not the first found", () => {
    const many = Array.from({ length: ACTIVITY_LIMIT + 5 }, (_, index) =>
      item(`2026-09-${String(index + 1).padStart(2, "0")}T00:00:00.000Z`),
    );
    // Derived rather than written out, so the assertion survives a change to
    // the cap — which is the one number here most likely to be retuned.
    const newest = many[many.length - 1].at;

    const merged = mergeActivity([many], OPEN);

    expect(merged).toHaveLength(ACTIVITY_LIMIT);
    expect(merged[0].at).toBe(newest);
  });

  it("refuses what happened before the reader arrived", () => {
    const merged = mergeActivity(
      [
        [
          item("2026-09-15T00:00:00.000Z", "po prichode"),
          item("2026-09-01T00:00:00.000Z", "pred prichodom"),
        ],
      ],
      Date.parse("2026-09-10T00:00:00.000Z"),
    );

    const titles = merged.map((row) =>
      row.kind === "wish-added" ? row.title : null,
    );

    expect(titles).toEqual(["po prichode"]);
  });

  it("refuses one at exactly the floor — the arrival is not itself news", () => {
    const at = "2026-09-10T00:00:00.000Z";

    expect(mergeActivity([[item(at)]], Date.parse(at))).toEqual([]);
  });

  // The whole point: the day the feature ships, every row predates the floor.
  it("hands an account that has just arrived an empty list", () => {
    const merged = mergeActivity(
      [[item("2026-09-15T00:00:00.000Z")], [item("2026-09-10T00:00:00.000Z")]],
      Date.parse("2026-09-16T00:00:00.000Z"),
    );

    expect(merged).toEqual([]);
  });
});

describe("countUnseen", () => {
  const items = [
    item("2026-09-15T00:00:00.000Z"),
    item("2026-09-10T00:00:00.000Z"),
  ];

  it("counts everything for an account that has never looked", () => {
    expect(countUnseen(items, null)).toBe(2);
  });

  it("counts only what happened after the last look", () => {
    expect(countUnseen(items, "2026-09-12T00:00:00.000Z")).toBe(1);
  });

  it("treats an item at exactly the last look as seen", () => {
    expect(countUnseen(items, "2026-09-15T00:00:00.000Z")).toBe(0);
  });
});

describe("activityKey", () => {
  it("separates two kinds of event about one wish", () => {
    const added = activityKey(item("2026-09-15T00:00:00.000Z"));
    const claimed = activityKey({
      kind: "wish-claimed",
      at: "2026-09-15T00:00:00.000Z",
      wishId: "2026-09-15T00:00:00.000Z",
      title: "Bicykel",
      owner: { id: ZUZANA, name: "Zuzana" },
      group: RODINA,
      claimer: null,
    });

    expect(added).not.toBe(claimed);
  });
});
