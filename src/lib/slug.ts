/** Mirror of the database slug rule for organisations (validated again server-side). */
export const ORG_SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{1,46}[a-z0-9])$/;

export function slugify(input: string, maxLength = 48): string {
  return input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " en ")
    .replace(/[^a-z0-9]+/g, "-")
    .slice(0, maxLength)
    .replace(/^-+|-+$/g, "");
}

export function isValidOrgSlug(slug: string) {
  return ORG_SLUG_PATTERN.test(slug);
}
