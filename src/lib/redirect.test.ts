import { describe, expect, it } from "vitest";
import { safeNextPath } from "./redirect";

describe("safeNextPath", () => {
  it("allows relative paths", () => {
    expect(safeNextPath("/dashboard/menu?x=1")).toBe("/dashboard/menu?x=1");
  });
  it("blocks open redirects", () => {
    for (const bad of ["https://evil.com", "//evil.com", "/\\evil.com", "javascript:alert(1)", null, 42]) {
      expect(safeNextPath(bad)).toBe("/dashboard");
    }
  });
});
