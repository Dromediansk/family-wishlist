import { describe, expect, it } from "vitest";

import {
  isNeededByAcceptable,
  isNeededByDate,
  isNeededByPast,
  neededByColumn,
  neededByIntent,
} from "@/lib/needed-by";

/*
 * Every `now` is an explicit UTC instant, chosen against Bratislava's clock:
 * the server runs in UTC, the reader does not, and the day boundary is where
 * the two disagree.
 */
// 22:30Z on 2 Oct is 00:30 on 3 Oct in Bratislava (CEST, +2).
const JUST_AFTER_MIDNIGHT_CEST = new Date("2026-10-02T22:30:00Z");
// 21:59Z on 2 Oct is 23:59 on 2 Oct in Bratislava.
const JUST_BEFORE_MIDNIGHT_CEST = new Date("2026-10-02T21:59:00Z");
// 23:30Z on 31 Dec is 00:30 on 1 Jan in Bratislava (CET, +1).
const JUST_AFTER_MIDNIGHT_CET = new Date("2026-12-31T23:30:00Z");

describe("isNeededByDate", () => {
  it("accepts a real calendar date", () => {
    expect(isNeededByDate("2026-10-15")).toBe(true);
    expect(isNeededByDate("2028-02-29")).toBe(true);
  });

  it("refuses an impossible one", () => {
    expect(isNeededByDate("2026-02-30")).toBe(false);
    expect(isNeededByDate("2026-13-01")).toBe(false);
  });

  it("refuses anything not shaped yyyy-MM-dd", () => {
    expect(isNeededByDate("2026-1-5")).toBe(false);
    expect(isNeededByDate("15.10.2026")).toBe(false);
    expect(isNeededByDate("2026-10-15T00:00:00Z")).toBe(false);
    expect(isNeededByDate("tomorrow")).toBe(false);
    expect(isNeededByDate("")).toBe(false);
  });
});

describe("isNeededByPast", () => {
  it("reads today from Bratislava's clock, not the server's", () => {
    // Bratislava is already on 3 Oct; UTC is still on 2 Oct.
    expect(isNeededByPast("2026-10-02", JUST_AFTER_MIDNIGHT_CEST)).toBe(true);
    expect(isNeededByPast("2026-10-03", JUST_AFTER_MIDNIGHT_CEST)).toBe(false);
  });

  it("does not call today passed until it is over", () => {
    expect(isNeededByPast("2026-10-02", JUST_BEFORE_MIDNIGHT_CEST)).toBe(false);
  });

  it("holds in winter time, across a year boundary", () => {
    expect(isNeededByPast("2026-12-31", JUST_AFTER_MIDNIGHT_CET)).toBe(true);
    expect(isNeededByPast("2027-01-01", JUST_AFTER_MIDNIGHT_CET)).toBe(false);
  });
});

describe("isNeededByAcceptable", () => {
  it("allows yesterday — one day of slack for a reader ahead of the server", () => {
    expect(isNeededByAcceptable("2026-10-02", JUST_AFTER_MIDNIGHT_CEST)).toBe(
      true,
    );
    expect(isNeededByAcceptable("2026-12-31", JUST_AFTER_MIDNIGHT_CET)).toBe(
      true,
    );
  });

  it("refuses the day before yesterday", () => {
    expect(isNeededByAcceptable("2026-10-01", JUST_AFTER_MIDNIGHT_CEST)).toBe(
      false,
    );
    expect(isNeededByAcceptable("2026-12-30", JUST_AFTER_MIDNIGHT_CET)).toBe(
      false,
    );
  });

  it("allows today and any later day", () => {
    expect(isNeededByAcceptable("2026-10-03", JUST_AFTER_MIDNIGHT_CEST)).toBe(
      true,
    );
    expect(isNeededByAcceptable("2099-12-24", JUST_AFTER_MIDNIGHT_CEST)).toBe(
      true,
    );
  });
});

describe("neededByIntent", () => {
  it("leaves an untouched date alone, even one already past", () => {
    // Also what a cleared-then-repicked original is: only what the field holds
    // counts, not how it got there.
    expect(neededByIntent("2020-01-01", "2020-01-01")).toEqual({
      kind: "unchanged",
    });
  });

  it("clears an emptied field", () => {
    expect(neededByIntent("", "2026-10-15")).toEqual({ kind: "clear" });
  });

  it("sets a new date", () => {
    expect(neededByIntent("2026-11-01", "2026-10-15")).toEqual({
      kind: "set",
      date: "2026-11-01",
    });
    expect(neededByIntent("2026-11-01", null)).toEqual({
      kind: "set",
      date: "2026-11-01",
    });
  });

  it("treats an empty field on a new wish as nothing to change", () => {
    expect(neededByIntent("", null)).toEqual({ kind: "unchanged" });
  });
});

describe("neededByColumn", () => {
  it("keeps the stored value on unchanged", () => {
    expect(neededByColumn({ kind: "unchanged" })).toEqual({
      set: false,
      value: null,
    });
  });

  it("writes NULL on clear", () => {
    expect(neededByColumn({ kind: "clear" })).toEqual({
      set: true,
      value: null,
    });
  });

  it("writes the date on set", () => {
    expect(neededByColumn({ kind: "set", date: "2026-11-01" })).toEqual({
      set: true,
      value: "2026-11-01",
    });
  });
});
