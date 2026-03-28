"use client";

import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import HomeClient from "./HomeClient";
import ProfileClient from "./ProfileClient";
import ListDetailClient from "./ListDetailClient";
import BottomNav from "./BottomNav";
import type { List, Item, Profile } from "@/lib/supabase/types";
import type { MemberWithProfile } from "./ShareModal";

interface HomeProps {
  lists: List[];
  sharingMap: Record<string, string>;
  totalVotesMap: Record<string, number>;
  votedTodayIds: string[];
  leaderMap: Record<string, string | null>;
  userId: string;
  initialOrder: string[];
}

interface ProfileProps {
  profile: Profile | null;
  userId: string;
  email: string;
  totalLists: number;
  totalVotes: number;
  totalCompleted: number;
  sharedLists: number;
}

interface ListDetail {
  list: List;
  initialItems: Item[];
  latestVote: { item_id: string; voted_date: string } | null;
  isOwner: boolean;
  isAnonymous: boolean;
  initialMembers: MemberWithProfile[];
  ownerUsername: string | null;
}

interface Props {
  homeProps: HomeProps;
  profileProps: ProfileProps;
  listDetails: ListDetail[];
  isAnonymous: boolean;
  children: React.ReactNode;
}

export default function TabShell({ homeProps, profileProps, listDetails, isAnonymous, children }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  async function handleCreateAccount() {
    await supabase.auth.signOut();
    router.push("/login?tab=signup");
  }
  const isHome = pathname === "/home" || pathname === "/";
  const isProfile = pathname === "/profile";
  const isTabRoute = isHome || isProfile;

  const listIdMatch = pathname.match(/^\/list\/([^/]+)$/);
  const currentListId = listIdMatch?.[1] ?? null;
  const isKnownList = currentListId !== null && listDetails.some((d) => d.list.id === currentListId);

  return (
    <div className="flex flex-col min-h-full bg-bg" style={{ paddingTop: "env(safe-area-inset-top)" }}>
      {isAnonymous && (
        <div className="text-center py-2 px-4 text-xs" style={{ backgroundColor: "rgba(200,169,110,0.1)", borderBottom: "1px solid rgba(200,169,110,0.2)", color: "#c8a96e" }}>
          Modo demo · Se borrará en 24h ·{" "}
          <button onClick={handleCreateAccount} className="underline font-medium">Crear cuenta ahora</button>
        </div>
      )}
      <main className="flex-1">
        {/* Tabs — always mounted, CSS toggled for instant switching */}
        <div style={{ display: isHome ? "block" : "none" }}>
          <HomeClient {...homeProps} />
        </div>
        <div style={{ display: isProfile ? "block" : "none" }}>
          <ProfileClient {...profileProps} />
        </div>

        {/* List details — pre-mounted, CSS toggled for instant navigation */}
        {listDetails.map((detail) => (
          <div
            key={detail.list.id}
            style={{ display: currentListId === detail.list.id ? "block" : "none" }}
          >
            <ListDetailClient
              {...detail}
              userId={homeProps.userId}
            />
          </div>
        ))}

        {/* Fallback for unknown routes (direct URL to unrecognised list, etc.) */}
        {!isTabRoute && !isKnownList && children}
      </main>
      <BottomNav />
    </div>
  );
}
