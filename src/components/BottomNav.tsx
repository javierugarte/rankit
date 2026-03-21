"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, User, Plus } from "lucide-react";

export default function BottomNav() {
  const pathname = usePathname();

  const isHome =
    pathname === "/home" || pathname === "/" || pathname.startsWith("/list");
  const isProfile = pathname === "/profile";

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 border-t border-border bg-surface z-50"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="max-w-lg mx-auto flex items-center justify-around px-6 py-3">
        {/* Home */}
        <Link
          href="/home"
          className={`flex flex-col items-center gap-1 px-4 py-2 transition-colors ${
            isHome ? "text-gold" : "text-muted hover:text-text"
          }`}
        >
          <Home size={22} strokeWidth={isHome ? 2.5 : 1.8} />
          <span className="text-[10px] font-medium">Inicio</span>
        </Link>

        {/* Create list — central gold button */}
        <Link
          href="/home?create=true"
          className="flex flex-col items-center gap-1 -mt-4"
        >
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-transform active:scale-95"
            style={{
              backgroundColor: "#c8a96e",
              boxShadow: "0 0 20px rgba(200, 169, 110, 0.4)",
            }}
          >
            <Plus size={26} strokeWidth={2.5} color="#0a0a0f" />
          </div>
        </Link>

        {/* Profile */}
        <Link
          href="/profile"
          className={`flex flex-col items-center gap-1 px-4 py-2 transition-colors ${
            isProfile ? "text-gold" : "text-muted hover:text-text"
          }`}
        >
          <User size={22} strokeWidth={isProfile ? 2.5 : 1.8} />
          <span className="text-[10px] font-medium">Perfil</span>
        </Link>
      </div>
    </nav>
  );
}
