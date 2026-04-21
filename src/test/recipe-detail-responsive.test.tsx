import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Static responsive layout check for RecipeDetail.
 *
 * We verify the source file has the layout invariants needed for the page to
 * render correctly on both mobile (≤640px) and desktop (≥1024px) viewports:
 *
 *   1. The hero image container shares the same `max-w-md mx-auto` column as
 *      the rest of the content, with a hard `max-h-[520px]` cap so the image
 *      cannot grow taller than the column on wide screens.
 *   2. The stats card (Cook / Level / Rating) lives in a sibling container
 *      that uses `max-w-md mx-auto -mt-6` so it overlaps the bottom of the
 *      hero in the same column at any viewport.
 *
 * This is a fast, dependency-free check — it does not require rendering the
 * component (which has heavy Supabase data dependencies) but still catches
 * regressions on the alignment classes.
 */
describe("RecipeDetail responsive layout (static)", () => {
  const source = readFileSync(
    resolve(__dirname, "../pages/RecipeDetail.tsx"),
    "utf8"
  );

  it("constrains the hero image container to max-w-md, mx-auto and a max height", () => {
    // Look for the wrapper around the hero <img>
    const heroMatch = source.match(/<div className="([^"]*relative[^"]*)">\s*<img/);
    expect(heroMatch, "expected hero <div> wrapping the <img>").toBeTruthy();

    const heroClasses = heroMatch![1];
    expect(heroClasses).toMatch(/\bmax-w-md\b/);
    expect(heroClasses).toMatch(/\bmx-auto\b/);
    expect(heroClasses).toMatch(/max-h-\[520px\]/);
    expect(heroClasses).toMatch(/\bh-\[55vh\]\b/);
    expect(heroClasses).toMatch(/\boverflow-hidden\b/);
  });

  it("aligns the stats card column with the hero (max-w-md mx-auto -mt-6)", () => {
    // The stats wrapper precedes the grid-cols-3 stats card
    const statsMatch = source.match(
      /<div className="([^"]*max-w-md[^"]*)">\s*<div className="[^"]*grid-cols-3/
    );
    expect(statsMatch, "expected stats column wrapper before grid-cols-3 card").toBeTruthy();

    const statsClasses = statsMatch![1];
    expect(statsClasses).toMatch(/\bmax-w-md\b/);
    expect(statsClasses).toMatch(/\bmx-auto\b/);
    expect(statsClasses).toMatch(/-mt-6/);
    expect(statsClasses).toMatch(/\bpx-5\b/);
  });

  it("renders the back button and favorite toggle as absolutely positioned overlays on the hero", () => {
    // Both controls must be inside the bounded hero (so they don't drift into
    // empty space on desktop where the hero is narrower than the viewport)
    expect(source).toMatch(/className="absolute top-4 left-4[^"]*"/);
    expect(source).toMatch(/absolute top-4 right-4/);
  });
});
