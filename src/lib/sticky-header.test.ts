import { describe, expect, it } from "vitest";

import {
  HIDE_AFTER,
  JUMP,
  nextHeaderState,
  SHOW_AFTER,
  shownHeaderState,
  TOP_ZONE,
  type HeaderState,
} from "@/lib/sticky-header";

/** A state part-way down the page, shown unless the test says otherwise. */
function state(overrides: Partial<HeaderState> = {}): HeaderState {
  return { hidden: false, anchor: 400, last: 400, ...overrides };
}

/** Folds a run of offsets the way the scroll listener would. */
function scroll(...offsets: number[]): HeaderState {
  return offsets.reduce(nextHeaderState, shownHeaderState(0));
}

describe("nextHeaderState", () => {
  it("stays shown near the top of the page", () => {
    expect(scroll(0, 20, TOP_ZONE).hidden).toBe(false);
  });

  it("hides once the reader has travelled down far enough to mean it", () => {
    expect(scroll(0, TOP_ZONE + HIDE_AFTER).hidden).toBe(true);
  });

  it("hides on the accumulated run, not on any one frame of it", () => {
    // What the listener actually feeds it: a frame at a time, each step by
    // itself under the threshold. Only the distance from the anchor trips it.
    const step = HIDE_AFTER - 1;
    expect(scroll(0, step, step * 2).hidden).toBe(false);
    expect(scroll(0, step, step * 2, step * 3).hidden).toBe(true);
  });

  it("keeps the header while a descent stays short of the threshold", () => {
    const settled = nextHeaderState(state(), 400 + HIDE_AFTER - 1);
    expect(settled.hidden).toBe(false);
    expect(settled.anchor).toBe(400);
  });

  it("does not accumulate jitter into a direction", () => {
    // Sample-to-sample deltas would sum to well past HIDE_AFTER here; measuring
    // from the highest point reached does not.
    const jittery = [440, 410, 450, 420, 455].reduce(nextHeaderState, state());
    expect(jittery.hidden).toBe(false);
    expect(jittery.anchor).toBe(400);
  });

  it("brings the header back after a shorter climb than it took to lose it", () => {
    const hidden = state({ hidden: true });
    expect(nextHeaderState(hidden, 400 - SHOW_AFTER + 1).hidden).toBe(true);
    expect(nextHeaderState(hidden, 400 - SHOW_AFTER).hidden).toBe(false);
  });

  it("measures the climb from the deepest point, not the last one", () => {
    const deeper = nextHeaderState(state({ hidden: true }), 460);
    expect(deeper.anchor).toBe(460);
    expect(nextHeaderState(deeper, 460 - SHOW_AFTER).hidden).toBe(false);
  });

  it("reads a restored scroll position as arrival rather than travel", () => {
    const parked = state({ hidden: true, anchor: 1000, last: 1000 });
    expect(nextHeaderState(parked, 1000 + JUMP + 1).hidden).toBe(false);
    // A descent the reader could plausibly have made still hides it.
    expect(
      nextHeaderState(state({ anchor: 1000, last: 1000 }), 1000 + JUMP).hidden,
    ).toBe(true);
  });

  it("treats the overscroll bounce past the top as no direction at all", () => {
    expect(nextHeaderState(state({ hidden: true }), -30)).toEqual(
      shownHeaderState(0),
    );
  });

  it("always reveals the header once the reader is back near the top", () => {
    expect(nextHeaderState(state({ hidden: true }), TOP_ZONE).hidden).toBe(
      false,
    );
  });
});

describe("shownHeaderState", () => {
  it("anchors the next run at the reader's position, never behind the top", () => {
    expect(shownHeaderState(500)).toEqual({
      hidden: false,
      anchor: 500,
      last: 500,
    });
    expect(shownHeaderState(-40).anchor).toBe(0);
  });
});
