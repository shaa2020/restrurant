import { Wordmark } from "@/components/ui";
import { isSupabaseConfigured } from "@/lib/env";
import { ConfigNotice } from "@/components/config-notice";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr_minmax(0,560px)]">
      <aside className="relative hidden overflow-hidden bg-ink lg:block">
        <div className="absolute inset-0 bg-[radial-gradient(120%_80%_at_20%_10%,#2a2723_0%,#171717_60%)]" />
        <div className="relative flex h-full flex-col justify-between p-12 text-ivory">
          <Wordmark className="text-ivory" />
          <blockquote className="max-w-md">
            <p className="font-display text-[40px] leading-[1.1]">
              Hospitality is a craft. <span className="italic text-gold">Your software should be too.</span>
            </p>
            <p className="mt-6 text-sm text-ivory/60">Menus, ordering, kitchen and team — in one calm system.</p>
          </blockquote>
        </div>
      </aside>
      <main className="flex flex-col px-4 py-8 sm:px-12">
        <Wordmark className="lg:hidden" />
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 py-12 animate-rise-in">
          {!isSupabaseConfigured() && <ConfigNotice />}
          {children}
        </div>
      </main>
    </div>
  );
}
