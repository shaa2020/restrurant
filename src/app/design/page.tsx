import type { Metadata } from "next";
import { UtensilsCrossed } from "lucide-react";
import {
  Alert,
  Avatar,
  Badge,
  Button,
  Divider,
  EmptyState,
  Field,
  Input,
  PageHeader,
  SectionHeader,
  Select,
  Surface,
  Table,
  Td,
  Textarea,
  Th,
  Wordmark,
} from "@/components/ui";

export const metadata: Metadata = { title: "Design system", robots: { index: false } };

const colors = [
  { group: "Surfaces", items: [["ivory", "#F5F3EE", "App background"], ["paper", "#FBFAF7", "Raised surfaces"], ["stone-100", "#EFECE5", "Hover"], ["stone-200", "#E6E2D9", "Borders"]] },
  { group: "Ink", items: [["ink", "#171717", "Primary text · 16.2:1"], ["ink-2", "#3D3B37", "Secondary · 10.1:1"], ["ink-3", "#6B675F", "Meta text · 5.1:1"], ["ink-4", "#9A958B", "Placeholder only"]] },
  { group: "Accents", items: [["gold", "#B49A72", "Accent, never body text"], ["gold-ink", "#715C3D", "Gold text · 5.7:1"], ["sage", "#777D72", "Decorative"], ["sage-ink", "#4F554B", "Sage text · 6.9:1"]] },
  { group: "Semantic", items: [["success", "#4F6B4A", "Confirmed, paid"], ["warning", "#855B16", "Attention, delayed"], ["danger", "#A03D2C", "Destructive, failed"]] },
] as const;

/** Internal reference: every token and component in one place. */
export default function DesignSystemPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-8">
      <Wordmark />
      <div className="mt-12">
        <PageHeader
          eyebrow="Design system · v0.1"
          title="Quiet, precise, warm."
          description="Restraint over decoration. Every value on this page comes from tokens in globals.css — components never hard-code colours or spacing."
          actions={<Button variant="secondary">Secondary</Button>}
        />
      </div>

      <div className="flex flex-col gap-16">
        <section className="flex flex-col gap-6">
          <SectionHeader title="Colour" description="Warm ivory and charcoal, with gold and sage used sparingly. All text pairings meet WCAG AA." />
          {colors.map((g) => (
            <div key={g.group} className="flex flex-col gap-3">
              <p className="text-xs font-medium text-ink-3">{g.group}</p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {g.items.map(([name, hex, use]) => (
                  <div key={name} className="flex flex-col gap-2">
                    <div className="h-16 rounded-md shadow-hairline" style={{ background: hex }} />
                    <div>
                      <p className="text-sm font-medium">{name}</p>
                      <p className="font-mono text-2xs text-ink-3">{hex}</p>
                      <p className="text-2xs text-ink-3">{use}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </section>

        <Divider />

        <section className="flex flex-col gap-6">
          <SectionHeader title="Typography" description="Instrument Serif for display moments; Inter for everything functional. Both self-hosted." />
          <div className="flex flex-col gap-5">
            <p className="font-display text-[64px] leading-none">Display 64</p>
            <p className="font-display text-[44px] leading-none">Page title 44</p>
            <p className="text-xl font-medium">Heading 20 · Inter Medium</p>
            <p className="text-[15px] font-semibold">Section 15 · Semibold</p>
            <p className="max-w-prose text-[15px] leading-relaxed text-ink-2">
              Body 15 — A slow-cooked beef cheek with celeriac purée, glazed shallots and a red wine jus. Used for guest-facing copy and longer descriptions.
            </p>
            <p className="text-sm text-ink-2">UI 14 — Default for dashboards, tables and forms.</p>
            <p className="text-[13px] text-ink-3">Meta 13 — Hints, timestamps, secondary labels.</p>
            <p className="text-xs font-medium tracking-[0.08em] text-gold-ink uppercase">Eyebrow 12 · tracked</p>
            <p className="text-2xl font-medium tabular">€ 1.284,50 · 09:41 · 128</p>
          </div>
        </section>

        <Divider />

        <section className="flex flex-col gap-6">
          <SectionHeader title="Buttons" description="One primary action per view. Touch size (56px) for POS and kitchen screens." />
          <div className="flex flex-wrap items-center gap-3">
            <Button>Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="accent">Accent</Button>
            <Button variant="danger">Delete</Button>
            <Button loading>Saving</Button>
            <Button disabled>Disabled</Button>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button size="sm">Small</Button>
            <Button size="md">Medium</Button>
            <Button size="lg">Large</Button>
            <Button size="touch">Touch · Pay € 42,00</Button>
          </div>
        </section>

        <Divider />

        <section className="grid gap-10 md:grid-cols-2">
          <div className="flex flex-col gap-5">
            <SectionHeader title="Form fields" />
            <Field label="Dish name">
              <Input placeholder="Beef cheek, celeriac, red wine" />
            </Field>
            <Field label="Price" hint="Including VAT">
              <Input defaultValue="24,50" inputMode="decimal" />
            </Field>
            <Field label="Slug" error="This web address is already taken">
              <Input defaultValue="bistro-amstel" />
            </Field>
            <Field label="VAT rate">
              <Select defaultValue="900">
                <option value="900">9% — food & non-alcoholic drinks</option>
                <option value="2100">21% — alcohol</option>
              </Select>
            </Field>
            <Field label="Description" optional>
              <Textarea placeholder="What makes this dish special?" />
            </Field>
          </div>
          <div className="flex flex-col gap-5">
            <SectionHeader title="Badges & alerts" />
            <div className="flex flex-wrap gap-2">
              <Badge>Neutral</Badge>
              <Badge tone="gold" dot>Free trial</Badge>
              <Badge tone="sage">Vegetarian</Badge>
              <Badge tone="success" dot>Paid</Badge>
              <Badge tone="warning" dot>Delayed 4m</Badge>
              <Badge tone="danger">Out of stock</Badge>
              <Badge tone="outline">Gluten</Badge>
            </div>
            <Alert tone="info" title="Heads up">Menu changes go live for guests immediately.</Alert>
            <Alert tone="success">Payment confirmed by provider.</Alert>
            <Alert tone="warning" title="Low stock">Shallots below 2 kg at Centrum.</Alert>
            <Alert tone="danger">The payment was declined.</Alert>
          </div>
        </section>

        <Divider />

        <section className="flex flex-col gap-6">
          <SectionHeader title="Surfaces & data" description="Hairline tables, no zebra stripes. Surfaces group content; they don't decorate numbers." />
          <Surface className="flex flex-col gap-4">
            <p className="text-xs text-ink-3">Example rows — illustrative only, not live data</p>
            <Table>
              <thead>
                <tr><Th>Member</Th><Th>Role</Th><Th className="text-right">Status</Th></tr>
              </thead>
              <tbody>
                <tr>
                  <Td><span className="flex items-center gap-3 text-ink"><Avatar name="Sanne de Vries" className="size-7" />Sanne de Vries</span></Td>
                  <Td>Owner</Td>
                  <Td className="text-right"><Badge tone="sage">Active</Badge></Td>
                </tr>
                <tr>
                  <Td><span className="flex items-center gap-3 text-ink"><Avatar name="Youssef El Amrani" className="size-7" />Youssef El Amrani</span></Td>
                  <Td>Kitchen</Td>
                  <Td className="text-right"><Badge tone="sage">Active</Badge></Td>
                </tr>
              </tbody>
            </Table>
          </Surface>
          <EmptyState
            icon={UtensilsCrossed}
            title="No dishes yet"
            description="Add your first dish to start building your menu."
            action={<Button size="sm">Add dish</Button>}
          />
        </section>
      </div>
    </div>
  );
}
