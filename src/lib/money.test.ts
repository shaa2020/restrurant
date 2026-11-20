import { describe, expect, it } from "vitest";
import { formatMoney, parseMoneyInput, vatFromGross } from "./money";

describe("money", () => {
  it("formats euro amounts for the Dutch locale", () => {
    // Intl uses a non-breaking space between symbol and amount
    expect(formatMoney(1250)).toBe("€\u00a012,50");
    expect(formatMoney(0)).toBe("€\u00a00,00");
  });

  it("rejects non-integer cents", () => {
    expect(() => formatMoney(12.5)).toThrow(RangeError);
  });

  it("extracts VAT from VAT-inclusive prices (NL 9% and 21%)", () => {
    expect(vatFromGross(1090, 900)).toBe(90);
    expect(vatFromGross(1210, 2100)).toBe(210);
    expect(vatFromGross(1000, 900)).toBe(83); // 82.57 → 83
    expect(vatFromGross(-1090, 900)).toBe(-90); // refunds
    expect(vatFromGross(1000, 0)).toBe(0);
  });

  it("parses user input into cents", () => {
    expect(parseMoneyInput("12,50")).toBe(1250);
    expect(parseMoneyInput("€ 12.5")).toBe(1250);
    expect(parseMoneyInput("7")).toBe(700);
    expect(parseMoneyInput("1.234")).toBeNull();
    expect(parseMoneyInput("-3")).toBeNull();
    expect(parseMoneyInput("abc")).toBeNull();
  });
});
