import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import TabShell from "@/components/TabShell";
import type { List, Profile } from "@/lib/supabase/types";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Ensure profile exists (trigger may have failed on signup)
  await supabase.from("profiles").upsert(
    { id: user.id, username: user.email?.split("@")[0] ?? "user" },
    { onConflict: "id", ignoreDuplicates: true }
  );

  // ── Fetch home + profile data in parallel ──────────────────────────────────
  const [
    ownedListsResult,
    memberListIdsResult,
    profileResult,
    totalListsResult,
    totalVotesForStatsResult,
    sharedListsResult,
  ] = await Promise.all([
    supabase.from("lists").select("*").eq("owner_id", user.id).order("created_at", { ascending: false }),
    supabase.from("list_members").select("list_id").eq("user_id", user.id),
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase.from("lists").select("*", { count: "exact", head: true }).eq("owner_id", user.id),
    supabase.from("votes").select("*", { count: "exact", head: true }).eq("user_id", user.id),
    supabase.from("list_members").select("*", { count: "exact", head: true }).eq("user_id", user.id),
  ]);

  // Build member lists
  const memberIds = (memberListIdsResult.data ?? []).map((m) => m.list_id);
  let memberLists: List[] = [];
  const ownerUsernameMap: Record<string, string> = {};

  if (memberIds.length > 0) {
    const { data } = await supabase
      .from("lists")
      .select("*, profiles!lists_owner_id_fkey(username)")
      .in("id", memberIds)
      .neq("owner_id", user.id)
      .order("created_at", { ascending: false });
    for (const row of data ?? []) {
      ownerUsernameMap[row.id] =
        (row.profiles as { username: string } | null)?.username ?? "alguien";
    }
    memberLists = (data ?? []).map(({ profiles: _p, ...rest }) => rest as List);
  }

  const allLists: List[] = [...(ownedListsResult.data ?? []), ...memberLists];
  const listIds = allLists.map((l) => l.id);
  const ownedListIds = (ownedListsResult.data ?? []).map((l) => l.id);

  // Fetch list-dependent data in parallel
  const today = new Date().toISOString().split("T")[0];
  const [itemsResult, membersResult, todayVotesResult, totalCompletedResult] = await Promise.all([
    listIds.length > 0
      ? supabase.from("items").select("list_id, total_votes, title").in("list_id", listIds).eq("completed", false).order("total_votes", { ascending: false })
      : Promise.resolve({ data: [] as { list_id: string; total_votes: number; title: string }[] }),
    listIds.length > 0
      ? supabase.from("list_members").select("list_id, user_id, profiles(username)").in("list_id", listIds)
      : Promise.resolve({ data: [] }),
    listIds.length > 0
      ? supabase.from("votes").select("list_id").eq("user_id", user.id).in("list_id", listIds).eq("voted_date", today)
      : Promise.resolve({ data: [] }),
    ownedListIds.length > 0
      ? supabase.from("items").select("*", { count: "exact", head: true }).eq("completed", true).in("list_id", ownedListIds)
      : Promise.resolve({ count: 0 }),
  ]);

  // Build totalVotesMap and leaderMap
  const totalVotesMap: Record<string, number> = {};
  const leaderMap: Record<string, string> = {};
  for (const item of itemsResult.data ?? []) {
    totalVotesMap[item.list_id] = (totalVotesMap[item.list_id] ?? 0) + item.total_votes;
    if (!(item.list_id in leaderMap) && item.total_votes > 0) {
      leaderMap[item.list_id] = item.title;
    }
  }

  // Build sharingMap
  const otherMembersPerList: Record<string, string[]> = {};
  for (const row of membersResult.data ?? []) {
    if (row.user_id === user.id) continue;
    const username =
      (row.profiles as { username: string } | null)?.username ?? "alguien";
    otherMembersPerList[row.list_id] = [
      ...(otherMembersPerList[row.list_id] ?? []),
      username,
    ];
  }
  const memberListIdSet = new Set(memberIds);
  const sharingMap: Record<string, string> = {};
  for (const list of allLists) {
    if (memberListIdSet.has(list.id) && list.owner_id !== user.id) {
      sharingMap[list.id] = `De ${ownerUsernameMap[list.id] ?? "alguien"}`;
    } else {
      const others = otherMembersPerList[list.id] ?? [];
      if (others.length === 0) sharingMap[list.id] = "Privado";
      else if (others.length === 1) sharingMap[list.id] = `Con ${others[0]}`;
      else sharingMap[list.id] = `Con ${others.length} personas`;
    }
  }

  const votedTodaySet = new Set((todayVotesResult.data ?? []).map((r) => r.list_id));

  return (
    <TabShell
      homeProps={{
        lists: allLists,
        sharingMap,
        totalVotesMap,
        votedTodayIds: [...votedTodaySet],
        leaderMap,
        userId: user.id,
      }}
      profileProps={{
        profile: profileResult.data as Profile | null,
        userId: user.id,
        email: user.email ?? "",
        totalLists: totalListsResult.count ?? 0,
        totalVotes: totalVotesForStatsResult.count ?? 0,
        totalCompleted: (totalCompletedResult as { count: number | null }).count ?? 0,
        sharedLists: sharedListsResult.count ?? 0,
      }}
    >
      {children}
    </TabShell>
  );
}
