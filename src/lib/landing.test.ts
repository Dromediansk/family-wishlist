import { describe, expect, it } from "vitest";

import { MOCK_WISHES, STORY_BEATS, toMockDisplayable } from "@/lib/landing";

import en from "../../messages/en.json";
import sk from "../../messages/sk.json";

describe("toMockDisplayable", () => {
  it("takes its title from the catalogue, and never a url or a photo — an illustration must not link out of the page, and /wish-photo serves somebody's real file", () => {
    expect(toMockDisplayable("book", "Kniha")).toEqual({
      id: "mock-book",
      title: "Kniha",
      description: null,
      url: null,
      photo: null,
    });
  });
});

describe("MOCK_WISHES", () => {
  it("names a title for every wish, in both languages", () => {
    for (const [locale, titles] of [
      ["sk", sk.landing.mock.wishes],
      ["en", en.landing.mock.wishes],
    ] as const) {
      for (const key of MOCK_WISHES) {
        const title = (titles as Record<string, string>)[key];
        expect(title, `${locale}: ${key}`).toBeDefined();
        expect(title.trim(), `${locale}: ${key}`).not.toBe("");
      }
    }
  });
});

describe("STORY_BEATS", () => {
  it("tells three beats, in order", () => {
    expect(STORY_BEATS.map((beat) => beat.key)).toEqual([
      "write",
      "reserve",
      "secret",
    ]);
  });

  it("alternates sides on the beside beats, and gives the third the full width", () => {
    expect(STORY_BEATS.map((beat) => beat.layout)).toEqual([
      "beside",
      "beside",
      "full",
    ]);
    expect(
      STORY_BEATS.filter((beat) => beat.layout === "beside").map(
        (beat) => beat.side,
      ),
    ).toEqual(["end", "start"]);
  });

  it("shows a different screen in each beat", () => {
    const mocks = STORY_BEATS.map((beat) => beat.mock);
    expect(new Set(mocks).size).toBe(mocks.length);
  });

  it("gives every beat a title and a body, in both languages", () => {
    for (const [locale, beats] of [
      ["sk", sk.landing.beats],
      ["en", en.landing.beats],
    ] as const) {
      for (const { key } of STORY_BEATS) {
        const beat = (beats as Record<string, { title: string; body: string }>)[
          key
        ];
        expect(beat, `${locale}: ${key}`).toBeDefined();
        expect(beat.title.trim(), `${locale}: ${key} title`).not.toBe("");
        expect(beat.body.trim(), `${locale}: ${key} body`).not.toBe("");
      }
    }
  });
});
