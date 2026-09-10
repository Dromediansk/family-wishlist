import { describe, expect, it } from "vitest";

import {
  HIDE_AFTER,
  INITIAL_HEADER_STATE,
  JUMP,
  nextHeaderState,
  SHOW_AFTER,
  TOP_ZONE,
  type HeaderState,
} from "@/lib/sticky-header";

/** Folds a run of offsets the way the scroll listener would. */
function scroll(...offsets: number[]): HeaderState {
  return offsets.reduce(nextHeaderState, INITIAL_HEADER_STATE);
}

describe("nextHeaderState", () => {
  it("starts shown and stays shown near the top of the page", () => {
    expect(INITIAL_HEADER_STATE.hidden).toBe(false);
    expect(scroll(0, 20, TOP_ZONE).hidden).toBe(false);
  });

  it("hides once the reader has travelled down far enough to mean it", () => {
    expect(scroll(0, TOP_ZONE + HIDE_AFTER).hidden).toBe(true);
  });

  it("keeps the header while a descent stays short of the threshold", () => {
    const settled = nextHeaderState(
      { hidden: false, anchor: 300, last: 300 },
      300 + HIDE_AFTER - 1,
    );
    expect(settled.hidden).toBe(false);
    expect(settled.anchor).toBe(300);
  });

  it("hides part-way through a run of frames, not on the first of them", () => {
    // What the listener actually feeds it: a frame at a time, small steps.
    expect(scroll(0, 60, 120).hidden).toBe(false);
    expect(scroll(0, 60, 120, 180).hidden).toBe(true);
  });

  it("does not accumulate jitter into a direction", () => {
    // Sample-to-sample deltas would sum to well past HIDE_AFTER here; measuring
    // from the highest point reached does not.
    const jittery = [340, 310, 350, 320, 355].reduce(nextHeaderState, {
      hidden: false,
      anchor: 300,
      last: 300,
    });
    expect(jittery.hidden).toBe(false);
    expect(jittery.anchor).toBe(300);
  });

  it("brings the header back after a shorter climb than it took to lose it", () => {
    expect(SHOW_AFTER).toBeLessThan(HIDE_AFTER);

    const hidden: HeaderState = { hidden: true, anchor: 400, last: 400 };
    expect(nextHeaderState(hidden, 400 - SHOW_AFTER + 1).hidden).toBe(true);
    expect(nextHeaderState(hidden, 400 - SHOW_AFTER).hidden).toBe(false);
  });

  it("measures the climb from the deepest point, not the last one", () => {
    const deeper = nextHeaderState(
      { hidden: true, anchor: 400, last: 400 },
      460,
    );
    expect(deeper.anchor).toBe(460);
    expect(nextHeaderState(deeper, 460 - SHOW_AFTER).hidden).toBe(false);
  });

  it("reads a restored scroll position as arrival rather than travel", () => {
    const parked: HeaderState = { hidden: true, anchor: 1000, last: 1000 };
    expect(nextHeaderState(parked, 1000 + JUMP + 1).hidden).toBe(false);
    // A descent the reader could plausibly have made still hides it.
    expect(
      nextHeaderState({ hidden: false, anchor: 1000, last: 1000 }, 1000 + JUMP)
        .hidden,
    ).toBe(true);
  });

  it("treats the overscroll bounce past the top as no direction at all", () => {
    expect(nextHeaderState({ hidden: true, anchor: 500, last: 500 }, -30))
      .toEqual({ hidden: false, anchor: 0, last: 0 });
  });

  it("always reveals the header once the reader is back near the top", () => {
    expect(
      nextHeaderState({ hidden: true, anchor: 300, last: 300 }, TOP_ZONE).hidden,
    ).toBe(false);
  });
});
