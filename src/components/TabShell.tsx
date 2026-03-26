"use client";

import { usePathname } from "next/navigation";
import HomeClient from "./HomeClient";
import ProfileClient from "./ProfileClient";
import BottomNav from "./BottomNav";
import type { List, Profile } from "@/lib/supabase/types";

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

interface Props {
  homeProps: HomeProps;
  profileProps: ProfileProps;
  children: React.ReactNode;
}

export default function TabShell({ homeProps, profileProps, children }: Props) {
  const pathname = usePathname();
  const isHome = pathname === "/home" || pathname === "/";
  const isProfile = pathname === "/profile";
  const isTabRoute = isHome || isProfile;

  return (
    <div className="flex flex-col min-h-full bg-bg" style={{ paddingTop: "env(safe-area-inset-top)" }}>
      <main className="flex-1">
        {/* Both tabs always mounted — CSS toggled for instant switching */}
        <div style={{ display: isHome ? "block" : "none" }}>
          <HomeClient {...homeProps} />
        </div>
        <div style={{ display: isProfile ? "block" : "none" }}>
          <ProfileClient {...profileProps} />
        </div>

        {/* Non-tab routes (list detail, etc.) */}
        {!isTabRoute && children}
      </main>
      <BottomNav />
    </div>
  );
}
