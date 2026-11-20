import { describe, expect, it } from "vitest";
import { isValidOrgSlug, slugify } from "./slug";

describe("slug", () => {
  it("slugifies restaurant names, including Dutch characters", () => {
    expect(slugify("Café de Ooievaar")).toBe("cafe-de-ooievaar");
    expect(slugify("  Bistro & Bar 't Hoekje! ")).toBe("bistro-en-bar-t-hoekje");
  });

  it("matches the database slug rule", () => {
    expect(isValidOrgSlug("bistro-amstel")).toBe(true);
    expect(isValidOrgSlug("ab")).toBe(false);
    expect(isValidOrgSlug("-bad")).toBe(false);
    expect(isValidOrgSlug("Bad")).toBe(false);
  });
});
