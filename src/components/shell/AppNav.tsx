"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { APP_BUILD } from "@/lib/config";
import { createClient, isCloudEnabled } from "@/lib/supabase/client";
import { useAuthStore } from "@/stores/auth-store";

const NAV = [
  { href: "/library", label: "Library" },
  { href: "/designer", label: "Designer" },
  { href: "/settings", label: "Settings" },
] as const;

export function AppNav() {
  const pathname = usePathname();
  const router = useRouter();
  const session = useAuthStore((s) => s.session);
  const signOut = useAuthStore((s) => s.signOut);

  async function handleSignOut() {
    if (isCloudEnabled()) {
      const supabase = createClient();
      await supabase?.auth.signOut();
    }
    signOut();
    router.replace("/login");
  }

  return (
    <header className="border-b border-fc-border bg-fc-nav">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-4">
        <div className="flex items-center gap-6">
          <Link href="/library" className="flex items-center gap-2 font-semibold text-fc-text">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-fc-accent text-sm font-bold text-white">
              FC
            </span>
            <span>FastCourt</span>
          </Link>
          <nav className="hidden items-center gap-1 sm:flex">
            {NAV.map((item) => {
              const active =
                pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-md px-3 py-2 text-sm transition-colors ${
                    active
                      ? "bg-fc-panel text-white"
                      : "text-fc-muted hover:bg-fc-panel/60 hover:text-white"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="hidden text-fc-muted md:inline">{APP_BUILD}</span>
          {session?.cloud ? (
            <span className="hidden rounded-full bg-emerald-900/40 px-2 py-0.5 text-xs text-emerald-300 sm:inline">
              Cloud
            </span>
          ) : null}
          {session ? (
            <>
              <span className="hidden text-fc-muted sm:inline">
                {session.user.displayName}
              </span>
              <button
                type="button"
                onClick={handleSignOut}
                className="rounded-md border border-fc-border px-3 py-1.5 text-fc-muted transition-colors hover:border-fc-accent hover:text-white"
              >
                Sign out
              </button>
            </>
          ) : null}
        </div>
      </div>
    </header>
  );
}
