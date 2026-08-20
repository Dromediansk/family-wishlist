import { describe, expect, it } from "vitest";

import manifest from "@/app/manifest";
import { THEME_COLORS } from "@/lib/theme-colors";

/**
 * Installability is easy to break silently — nothing fails to build, the app
 * just quietly stops offering to install itself. These pin the parts browsers
 * actually check.
 */
describe("manifest", () => {
  const result = manifest();

  it("opens at the root and keeps the whole app in scope", () => {
    expect(result.start_url).toBe("/");
    expect(result.scope).toBe("/");
  });

  it("runs without browser chrome", () => {
    expect(result.display).toBe("standalone");
  });

  it("is in Slovak", () => {
    expect(result.lang).toBe("sk");
    expect(result.short_name).toBe("Prajem si..");
  });

  it("keeps short_name short enough for a home screen label", () => {
    expect(result.short_name!.length).toBeLessThanOrEqual(12);
  });

  it("ships an icon big enough to install, usable as an adaptive icon", () => {
    const icons = result.icons ?? [];
    expect(icons.length).toBeGreaterThan(0);

    const installable = icons.filter((icon) => {
      const width = Number(icon.sizes?.split("x")[0]);
      return width >= 192;
    });
    expect(installable.length).toBeGreaterThan(0);
    expect(installable.some((icon) => icon.purpose?.includes("maskable"))).toBe(
      true,
    );
  });

  it("uses plain sRGB colours, not the oklch() from globals.css", () => {
    expect(result.background_color).toMatch(/^#[0-9a-f]{6}$/i);
    expect(result.theme_color).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it("splashes on the app's dark background, not the light one", () => {
    expect(result.background_color).toBe(THEME_COLORS.backgroundDark);
  });
});
