/**
 * Money is always integer minor units (cents) + ISO currency. Never floats.
 * VAT rates are basis points (900 = 9%). Prices are VAT-inclusive (EU B2C).
 */
export type Cents = number;

export function formatMoney(cents: Cents, currency = "EUR", locale = "nl-NL"): string {
  if (!Number.isSafeInteger(cents)) throw new RangeError(`invalid cents amount: ${cents}`);
  return new Intl.NumberFormat(locale, { style: "currency", currency }).format(cents / 100);
}

/** VAT contained in a VAT-inclusive amount, rounded half-up to the cent. */
export function vatFromGross(grossCents: Cents, vatBasisPoints: number): Cents {
  if (!Number.isSafeInteger(grossCents) || !Number.isInteger(vatBasisPoints) || vatBasisPoints < 0) {
    throw new RangeError("invalid VAT input");
  }
  // gross * rate / (10000 + rate), computed in integers to avoid float drift
  const numerator = grossCents * vatBasisPoints;
  const denominator = 10_000 + vatBasisPoints;
  const sign = numerator < 0 ? -1 : 1;
  return sign * Math.floor((Math.abs(numerator) * 2 + denominator) / (2 * denominator));
}

/** Parse a user-typed amount ("12,50", "12.5", "€ 12") into cents, or null if invalid. */
export function parseMoneyInput(input: string): Cents | null {
  const cleaned = input.replace(/[€\s]/g, "").replace(",", ".");
  if (!/^\d{1,7}(\.\d{1,2})?$/.test(cleaned)) return null;
  const [whole = "0", frac = ""] = cleaned.split(".");
  return Number(whole) * 100 + Number(frac.padEnd(2, "0"));
}
