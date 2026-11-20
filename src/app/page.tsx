import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { buttonClasses, Wordmark } from "@/components/ui";
import { brand } from "@/lib/brand";

const pillars = [
  { title: "Menu & ordering", body: "QR menus that load instantly, with photography, allergens, and dishes guests can turn in 3D." },
  { title: "Service", body: "A POS built for touch, and a kitchen display that keeps every ticket on time." },
  { title: "Back of house", body: "Recipes, stock, suppliers and food cost, tied to every order automatically." },
  { title: "Guests & team", body: "Consent-aware loyalty and CRM, schedules, clocking and shift handovers." },
];

export default function HomePage() {
  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-6 sm:px-8">
        <Wordmark />
        <nav className="flex items-center gap-1 sm:gap-2">
          <Link href="/pricing" className={buttonClasses("ghost", "sm")}>Pricing</Link>
          <Link href="/sign-in" className={buttonClasses("ghost", "sm")}>Sign in</Link>
          <Link href="/sign-up" className={buttonClasses("primary", "sm")}>Start free</Link>
        </nav>
      </header>

      <main>
        <section className="mx-auto max-w-6xl px-4 pt-20 pb-24 sm:px-8 sm:pt-32">
          <p className="text-xs font-medium tracking-[0.12em] text-gold-ink uppercase animate-fade-in">{brand.productName}</p>
          <h1 className="mt-5 max-w-4xl font-display text-[52px] leading-[1.02] tracking-[-0.015em] sm:text-[84px] animate-rise-in">
            The quiet engine behind <span className="italic text-gold-ink">exceptional</span> restaurants.
          </h1>
          <p className="mt-8 max-w-xl text-lg leading-relaxed text-ink-3">
            Menus, ordering, POS, kitchen display and back-office in one considered system — designed in the Netherlands for European hospitality.
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-3">
            <Link href="/sign-up" className={buttonClasses("primary", "lg")}>
              Start your 14-day trial <ArrowRight aria-hidden className="size-4" />
            </Link>
            <Link href="/pricing" className={buttonClasses("secondary", "lg")}>See plans</Link>
          </div>
        </section>

        <section className="border-t border-stone-200">
          <div className="mx-auto grid max-w-6xl gap-x-12 gap-y-10 px-4 py-20 sm:grid-cols-2 sm:px-8 lg:grid-cols-4">
            {pillars.map((p, i) => (
              <div key={p.title} className="flex flex-col gap-3">
                <span className="text-xs text-gold-ink tabular">0{i + 1}</span>
                <h2 className="text-[17px] font-medium">{p.title}</h2>
                <p className="text-sm leading-relaxed text-ink-3">{p.body}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-stone-200">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-8 text-[13px] text-ink-3 sm:px-8">
          <span>© {new Date().getFullYear()} {brand.productName}</span>
          <span>Data hosted in the EU</span>
        </div>
      </footer>
    </div>
  );
}
