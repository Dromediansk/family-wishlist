/**
 * `sniffImageType` is the pin here. The `type` on an uploaded File is whatever
 * the caller wrote, and `addWish` is reachable by direct POST, so these bytes
 * are the only evidence the app has about what it is storing and serving back.
 */

import { describe, expect, it } from "vitest";

import {
  contentTypeFor,
  extensionFor,
  fitWithin,
  photoVersion,
  sniffImageType,
} from "@/lib/images";

const PNG = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0,
]);
const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0]);
const WEBP = new Uint8Array([
  0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
]);

describe("fitWithin", () => {
  it("leaves an image already inside the box alone", () => {
    expect(fitWithin(800, 600, 1200)).toEqual({ width: 800, height: 600 });
  });

  it("never enlarges a small one", () => {
    expect(fitWithin(64, 48, 1200)).toEqual({ width: 64, height: 48 });
  });

  it("scales the longest edge down to the limit", () => {
    expect(fitWithin(4000, 3000, 1200)).toEqual({ width: 1200, height: 900 });
    expect(fitWithin(3000, 4000, 1200)).toEqual({ width: 900, height: 1200 });
  });

  it("keeps the aspect ratio of a square square", () => {
    expect(fitWithin(2400, 2400, 1200)).toEqual({ width: 1200, height: 1200 });
  });

  it("never rounds an edge away to nothing", () => {
    expect(fitWithin(4000, 1, 1200)).toEqual({ width: 1200, height: 1 });
  });
});

describe("sniffImageType", () => {
  it("recognises the three types the app stores", () => {
    expect(sniffImageType(PNG)).toBe("image/png");
    expect(sniffImageType(JPEG)).toBe("image/jpeg");
    expect(sniffImageType(WEBP)).toBe("image/webp");
  });

  it("refuses anything else, whatever it was labelled", () => {
    expect(sniffImageType(new Uint8Array([0x25, 0x50, 0x44, 0x46]))).toBeNull(); // %PDF
    expect(sniffImageType(new Uint8Array([0x3c, 0x73, 0x76, 0x67]))).toBeNull(); // <svg
    expect(sniffImageType(new Uint8Array([0x00, 0x00, 0x00, 0x00]))).toBeNull();
  });

  it("refuses bytes too short to identify rather than reading past them", () => {
    expect(sniffImageType(new Uint8Array([]))).toBeNull();
    expect(sniffImageType(new Uint8Array([0xff, 0xd8]))).toBeNull();
    // RIFF without the WEBP tag is some other RIFF container.
    expect(sniffImageType(new Uint8Array([0x52, 0x49, 0x46, 0x46]))).toBeNull();
  });
});

describe("extensionFor", () => {
  it("gives each stored type one spelling", () => {
    expect(extensionFor("image/webp")).toBe("webp");
    expect(extensionFor("image/jpeg")).toBe("jpg");
    expect(extensionFor("image/png")).toBe("png");
  });
});

describe("contentTypeFor", () => {
  it("maps a stored path back to its type", () => {
    expect(contentTypeFor("a/b.webp")).toBe("image/webp");
    expect(contentTypeFor("a/b.jpg")).toBe("image/jpeg");
    expect(contentTypeFor("a/b.png")).toBe("image/png");
  });

  it("accepts the other spelling of a JPEG", () => {
    expect(contentTypeFor("a/b.jpeg")).toBe("image/jpeg");
    expect(contentTypeFor("a/b.JPEG")).toBe("image/jpeg");
  });

  it("returns null rather than echoing an unknown extension", () => {
    expect(contentTypeFor("a/b.svg")).toBeNull();
    expect(contentTypeFor("a/b.html")).toBeNull();
    expect(contentTypeFor("a/b")).toBeNull();
  });
});

describe("photoVersion", () => {
  it("is the file name, which changes with every upload", () => {
    expect(
      photoVersion("11111111-1111-1111-1111-111111111111/abc123.webp"),
    ).toBe("abc123");
  });

  it("has nothing to say about a wish with no photo", () => {
    expect(photoVersion(null)).toBeNull();
  });

  it("survives a path that is not shaped as expected", () => {
    expect(photoVersion("abc123")).toBe("abc123");
    expect(photoVersion("wish/.webp")).toBeNull();
    expect(photoVersion("")).toBeNull();
  });
});
