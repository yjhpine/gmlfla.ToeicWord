"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/words", label: "단어" },
  { href: "/quiz", label: "시험" },
];

export function AppNav() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-10 border-b border-[var(--line)] bg-[var(--bg)]/90 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
        <Link
          href="/"
          className="font-[family-name:var(--font-display)] text-lg tracking-tight text-[var(--accent)]"
        >
          희림 토익
        </Link>
        <nav className="flex gap-1">
          {links.map((link) => {
            const active = pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={
                  active
                    ? "rounded-md bg-[var(--accent-soft)] px-3 py-1.5 text-sm font-medium text-[var(--accent)]"
                    : "rounded-md px-3 py-1.5 text-sm text-[var(--muted)] hover:text-[var(--fg)]"
                }
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
