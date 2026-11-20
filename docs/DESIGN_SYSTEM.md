# Design system

Live reference: run the app and open **`/design`**. Tokens live in `src/app/globals.css` (`@theme`), and components in `src/components/ui`.

## Principles
1. **Restraint.** Use a few surfaces, hairline dividers rather than boxes, and no gradients or glass. A card has to earn its place.
2. **One obvious primary action per view**, in charcoal. Everything else is secondary or ghost.
3. **Serif for moments, sans for work.** Instrument Serif is for page titles and hero lines. Inter is for everything functional.
4. **Numbers are tabular** (`.tabular`), so prices and timers don't jitter.
5. **Touch first where it matters.** POS and KDS use `size="touch"` (56 px), and nothing interactive there is under 48 px.
6. **Motion is quick and quiet**: 150–320 ms, ease-out, with `prefers-reduced-motion` respected globally.

## Colour usage
| Token | Use | Don't |
|---|---|---|
| `ivory` / `paper` | Background / raised surfaces and inputs | |
| `ink`, `ink-2`, `ink-3` | Text hierarchy (all ≥ 5:1 on ivory) | Use `ink-4` for text (placeholders only) |
| `gold` | Focus rings, small accents, icons, rules | Body text (2.4:1) |
| `gold-ink` | Eyebrows and gold-toned text (5.7:1) | |
| `sage` / `sage-ink` | Dietary and "included" states | Use `sage` for text |
| `success` / `warning` / `danger` | Paid / delayed / failed only | Decoration |

All text and background pairs were checked against WCAG 2.1 AA (≥ 4.5:1). The ratios are listed in `globals.css` and on `/design`.

## Components (v0.1)
`Button` (primary · secondary · ghost · accent · danger; sizes sm · md · lg · touch; loading), `SubmitButton`, `Input`, `Textarea`, `Select`, `Field` (label, hint, error, with aria wiring), `Badge`, `Alert`, `Surface`, `SectionHeader`, `Divider`, `PageHeader`, `EmptyState`, `Avatar`, `Table`/`Th`/`Td`, `Spinner`, `Wordmark`.

Planned with their stages: Dialog/Sheet and Toast (Stage 2), Tabs and Segmented control (Stage 2), the guest-menu dish card and cart sheet (Stage 3), the POS keypad and ticket card (Stage 4), and a dark KDS theme (Stage 4).
