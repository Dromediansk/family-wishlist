import { describe, expect, it } from "vitest";

import { asGroupId } from "@/lib/ids";
import { channelFor, LIVE_EVENT, LIVE_PAYLOAD, LIVE_TOPIC } from "@/lib/live";

/**
 * A broadcast goes to every open tab, including the tab of the person whose
 * list was just claimed from. The redaction in `getWishListFor` protects the
 * rendered page, not the socket — so the only thing keeping the surprise intact
 * on this path is that the ping says nothing at all. That is easy to undo by
 * accident ("just add the member id so we can refresh less"), so pin it.
 */
describe("live update ping", () => {
  it("carries no payload whatsoever", () => {
    expect(Object.keys(LIVE_PAYLOAD)).toHaveLength(0);
    expect(JSON.stringify(LIVE_PAYLOAD)).toBe("{}");
  });

  it("names nothing about wishes, members or claims", () => {
    const wire = JSON.stringify({
      topic: LIVE_TOPIC,
      event: LIVE_EVENT,
      payload: LIVE_PAYLOAD,
    });

    expect(wire).not.toMatch(/claim/i);
    expect(wire).not.toMatch(/member/i);
    expect(wire).not.toMatch(/wish(?!list)/i);
  });
});

describe("channelFor", () => {
  it("puts each group on its own topic", () => {
    expect(channelFor(asGroupId("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"))).toBe(
      "family-wishlist:aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    );
  });

  it("gives two different groups two different channels", () => {
    const a = channelFor(asGroupId("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"));
    const b = channelFor(asGroupId("bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"));

    expect(a).not.toBe(b);
    expect(a).toContain("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa");
    expect(b).toContain("bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb");
  });
});
