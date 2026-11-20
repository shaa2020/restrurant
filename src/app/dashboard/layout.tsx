import { LayoutGrid, LogOut, Plus } from "lucide-react";
import Link from "next/link";
import { Avatar, Wordmark } from "@/components/ui";
import { requireTenant } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "../(auth)/actions";
import { switchOrganization } from "./actions";
import { NavLink } from "./nav-link";

const roleLabel = { owner: "Owner", manager: "Manager", cashier: "Cashier", kitchen: "Kitchen", staff: "Staff" } as const;

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requireTenant();
  const supabase = await createClient();
  const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", ctx.user.id).maybeSingle();
  const displayName = profile?.full_name || ctx.user.email || "Account";

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[248px_1fr]">
      <aside className="flex flex-col gap-8 border-b border-stone-200 px-4 py-5 lg:sticky lg:top-0 lg:h-dvh lg:border-r lg:border-b-0 lg:px-4 lg:py-6">
        <div className="flex items-center justify-between px-2">
          <Wordmark href="/dashboard" />
        </div>

        {/* Organisation */}
        <div className="flex flex-col gap-1 px-2">
          <p className="text-2xs font-medium tracking-[0.08em] text-ink-3 uppercase">Restaurant</p>
          {ctx.memberships.length > 1 ? (
            <form action={switchOrganization} className="flex gap-1.5">
              <select
                name="organizationId"
                defaultValue={ctx.organization.id}
                aria-label="Switch restaurant"
                className="h-9 min-w-0 flex-1 rounded-md bg-paper px-2 text-sm shadow-hairline"
              >
                {ctx.memberships.map((m) => (
                  <option key={m.organizationId} value={m.organizationId}>
                    {m.name}
                  </option>
                ))}
              </select>
              <button type="submit" className="h-9 rounded-md px-2.5 text-xs font-medium text-ink-2 hover:bg-stone-100">
                Switch
              </button>
            </form>
          ) : (
            <p className="truncate text-[15px] font-medium text-ink">{ctx.organization.name}</p>
          )}
        </div>

        <nav aria-label="Main" className="flex flex-col gap-0.5">
          <NavLink href="/dashboard" exact>
            <LayoutGrid aria-hidden className="size-4" strokeWidth={1.75} /> Overview
          </NavLink>
        </nav>

        <div className="mt-auto hidden flex-col gap-3 lg:flex">
          <Link href="/onboarding?new=1" className="flex items-center gap-2 px-3 text-[13px] text-ink-3 hover:text-ink">
            <Plus aria-hidden className="size-3.5" /> Add another restaurant
          </Link>
          <div className="flex items-center gap-3 rounded-lg px-2 py-2">
            <Avatar name={displayName} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-ink">{displayName}</p>
              <p className="text-2xs text-ink-3">{roleLabel[ctx.role]}</p>
            </div>
            <form action={signOut}>
              <button type="submit" aria-label="Sign out" title="Sign out" className="rounded-md p-2 text-ink-3 hover:bg-stone-100 hover:text-ink">
                <LogOut className="size-4" strokeWidth={1.75} />
              </button>
            </form>
          </div>
        </div>
      </aside>

      <main className="px-4 py-8 sm:px-8 lg:px-14 lg:py-12">
        <div className="mx-auto max-w-5xl">{children}</div>
        <form action={signOut} className="mt-16 lg:hidden">
          <button type="submit" className="text-sm text-ink-3 underline underline-offset-4">
            Sign out
          </button>
        </form>
      </main>
    </div>
  );
}
