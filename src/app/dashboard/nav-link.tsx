"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function NavLink({ href, children, exact = false }: { href: string; children: ReactNode; exact?: boolean }) {
  const pathname = usePathname();
  const active = exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex h-9 items-center gap-2.5 rounded-md px-3 text-sm transition-colors duration-150",
        active ? "bg-paper font-medium text-ink shadow-raised" : "text-ink-3 hover:bg-stone-100 hover:text-ink",
      )}
    >
      {children}
    </Link>
  );
}
