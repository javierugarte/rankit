"use client";

import { useState, useCallback } from "react";
import { usePathname } from "next/navigation";
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
  initialMembers: MemberWithProfile[];
  ownerUsername: string | null;
}

interface Props {
  homeProps: HomeProps;
  profileProps: ProfileProps;
  listDetails: ListDetail[];
  children: React.ReactNode;
}

export default function TabShell({ homeProps, profileProps, listDetails, children }: Props) {
  const pathname = usePathname();
  const isHome = pathname === "/home" || pathname === "/";
  const isProfile = pathname === "/profile";
  const isTabRoute = isHome || isProfile;

  const listIdMatch = pathname.match(/^\/list\/([^/]+)$/);
  const currentListId = listIdMatch?.[1] ?? null;
  const isKnownList = currentListId !== null && listDetails.some((d) => d.list.id === currentListId);

  const [listOverrides, setListOverrides] = useState<Record<string, List>>({});
  const handleListUpdated = useCallback((updated: List) => {
    setListOverrides((prev) => ({ ...prev, [updated.id]: updated }));
  }, []);

  const listsWithOverrides = homeProps.lists.map((l) => listOverrides[l.id] ?? l);

  return (
    <div className="flex flex-col min-h-full bg-bg" style={{ paddingTop: "env(safe-area-inset-top)" }}>
      <main className="flex-1">
        {/* Tabs — always mounted, CSS toggled for instant switching */}
        <div style={{ display: isHome ? "block" : "none" }}>
          <HomeClient {...homeProps} lists={listsWithOverrides} />
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
              onListUpdated={handleListUpdated}
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
