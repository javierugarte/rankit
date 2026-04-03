import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import TabShell from "@/components/TabShell";
import type { List, Item, Profile } from "@/lib/supabase/types";
import type { MemberWithProfile } from "@/components/ShareModal";
import { getTranslations } from "next-intl/server";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const ts = await getTranslations("sharing");

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
    supabase.from("lists").select("*").eq("owner_id", user.id).order("created_at", { ascending: true }),
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
  const ownerProfileMap: Record<string, { id: string; username: string; avatar_url: string | null }> = {};

  if (memberIds.length > 0) {
    const { data } = await supabase
      .from("lists")
      .select("*, profiles!lists_owner_id_fkey(id, username, avatar_url)")
      .in("id", memberIds)
      .neq("owner_id", user.id)
      .order("created_at", { ascending: true });
    for (const row of data ?? []) {
      const ownerProfile = row.profiles as { id: string; username: string; avatar_url: string | null } | null;
      ownerUsernameMap[row.id] = ownerProfile?.username ?? ts("someone");
      if (ownerProfile) ownerProfileMap[row.id] = ownerProfile;
    }
    memberLists = (data ?? []).map(({ profiles: _p, ...rest }) => rest as List);
  }

  const allLists: List[] = [...(ownedListsResult.data ?? []), ...memberLists];
  const listIds = allLists.map((l) => l.id);
  const ownedListIds = (ownedListsResult.data ?? []).map((l) => l.id);

  // ── Fetch list-dependent data in parallel ──────────────────────────────────
  // Full items (all fields, all states) — used for both home stats and list detail
  const today = new Date().toISOString().split("T")[0];
  const [allItemsResult, membersResult, todayVotesResult, latestVotesResult, totalCompletedResult, allVotesResult] = await Promise.all([
    listIds.length > 0
      ? supabase.from("items").select("*").in("list_id", listIds).order("total_votes", { ascending: false })
      : Promise.resolve({ data: [] as Item[] }),
    listIds.length > 0
      ? supabase.from("list_members").select("list_id, user_id, profiles(username, avatar_url)").in("list_id", listIds)
      : Promise.resolve({ data: [] }),
    listIds.length > 0
      ? supabase.from("votes").select("list_id").eq("user_id", user.id).in("list_id", listIds).eq("voted_date", today)
      : Promise.resolve({ data: [] }),
    listIds.length > 0
      ? supabase.from("votes").select("list_id, item_id, voted_date").eq("user_id", user.id).in("list_id", listIds).order("voted_date", { ascending: false })
      : Promise.resolve({ data: [] as { list_id: string; item_id: string; voted_date: string }[] }),
    ownedListIds.length > 0
      ? supabase.from("items").select("*", { count: "exact", head: true }).eq("completed", true).in("list_id", ownedListIds)
      : Promise.resolve({ count: 0 }),
    listIds.length > 0
      ? supabase.from("votes").select("item_id, user_id").in("list_id", listIds)
      : Promise.resolve({ data: [] as { item_id: string; user_id: string }[] }),
  ]);

  // ── Build home data ─────────────────────────────────────────────────────────
  const totalVotesMap: Record<string, number> = {};
  const leaderMap: Record<string, string> = {};
  const itemsByList: Record<string, Item[]> = {};

  for (const item of allItemsResult.data ?? []) {
    // Group all items for list detail
    if (!itemsByList[item.list_id]) itemsByList[item.list_id] = [];
    itemsByList[item.list_id].push(item);

    // Only non-completed items count for home stats
    if (!item.completed) {
      totalVotesMap[item.list_id] = (totalVotesMap[item.list_id] ?? 0) + item.total_votes;
      if (!(item.list_id in leaderMap) && item.total_votes > 0) {
        leaderMap[item.list_id] = item.title;
      }
    }
  }

  // Build sharingMap
  const otherMembersPerList: Record<string, string[]> = {};
  const membersByList: Record<string, MemberWithProfile[]> = {};

  for (const row of membersResult.data ?? []) {
    const profile = row.profiles as { username: string; avatar_url: string | null } | null;
    const username = profile?.username ?? "alguien";
    if (!membersByList[row.list_id]) membersByList[row.list_id] = [];
    membersByList[row.list_id].push({ user_id: row.user_id, username, avatar_url: profile?.avatar_url ?? null });
    if (row.user_id !== user.id) {
      otherMembersPerList[row.list_id] = [...(otherMembersPerList[row.list_id] ?? []), username];
    }
  }

  // Build votesByItem: item_id → user_id → count
  const votesByItem: Record<string, Record<string, number>> = {};
  for (const vote of (allVotesResult.data ?? []) as { item_id: string; user_id: string }[]) {
    if (!votesByItem[vote.item_id]) votesByItem[vote.item_id] = {};
    votesByItem[vote.item_id][vote.user_id] = (votesByItem[vote.item_id][vote.user_id] ?? 0) + 1;
  }

  // Build allParticipantsByList: list_id → all participants (owner + members)
  const currentUserProfile: MemberWithProfile = {
    user_id: user.id,
    username: profileResult.data?.username ?? "yo",
    avatar_url: profileResult.data?.avatar_url ?? null,
  };
  const allParticipantsByList: Record<string, MemberWithProfile[]> = {};
  for (const list of allLists) {
    if (list.owner_id === user.id) {
      // Current user is the owner
      allParticipantsByList[list.id] = [currentUserProfile, ...(membersByList[list.id] ?? [])];
    } else {
      // Current user is a member; add owner from ownerProfileMap
      const ownerProfile = ownerProfileMap[list.id];
      const ownerEntry: MemberWithProfile = ownerProfile
        ? { user_id: ownerProfile.id, username: ownerProfile.username, avatar_url: ownerProfile.avatar_url }
        : { user_id: list.owner_id, username: ownerUsernameMap[list.id] ?? "alguien", avatar_url: null };
      allParticipantsByList[list.id] = [ownerEntry, ...(membersByList[list.id] ?? [])];
    }
  }

  const memberListIdSet = new Set(memberIds);
  const sharingMap: Record<string, string> = {};
  for (const list of allLists) {
    if (memberListIdSet.has(list.id) && list.owner_id !== user.id) {
      sharingMap[list.id] = ts("from", { name: ownerUsernameMap[list.id] ?? ts("someone") });
    } else {
      const others = otherMembersPerList[list.id] ?? [];
      if (others.length === 0) sharingMap[list.id] = ts("private");
      else if (others.length === 1) sharingMap[list.id] = ts("with", { name: others[0] });
      else sharingMap[list.id] = ts("withN", { count: others.length });
    }
  }

  const votedTodaySet = new Set((todayVotesResult.data ?? []).map((r) => r.list_id));

  // Latest vote per list (for list detail)
  const latestVoteByList: Record<string, { item_id: string; voted_date: string }> = {};
  for (const vote of latestVotesResult.data ?? []) {
    if (!latestVoteByList[vote.list_id]) {
      latestVoteByList[vote.list_id] = { item_id: vote.item_id, voted_date: vote.voted_date };
    }
  }

  const isAnonymous = user.is_anonymous ?? false;

  // Build list detail props for each list
  const listDetails = allLists.map((list) => {
    const isOwner = list.owner_id === user.id;
    const items = itemsByList[list.id] ?? [];
    const initialVotesByItem: Record<string, Record<string, number>> = {};
    for (const item of items) {
      initialVotesByItem[item.id] = votesByItem[item.id] ?? {};
    }
    return {
      list,
      initialItems: items,
      latestVote: latestVoteByList[list.id] ?? null,
      isOwner,
      isAnonymous,
      initialMembers: isOwner ? (membersByList[list.id] ?? []) : [],
      ownerUsername: isOwner ? null : (ownerUsernameMap[list.id] ?? null),
      allParticipants: allParticipantsByList[list.id] ?? [currentUserProfile],
      initialVotesByItem,
    };
  });

  return (
    <TabShell
      isAnonymous={user.is_anonymous ?? false}
      homeProps={{
        lists: allLists,
        sharingMap,
        totalVotesMap,
        votedTodayIds: [...votedTodaySet],
        leaderMap,
        userId: user.id,
        initialOrder: (user.user_metadata?.list_order as string[] | undefined) ?? [],
      }}
      profileProps={{
        profile: profileResult.data as Profile | null,
        userId: user.id,
        email: user.email ?? "",
        isAnonymous: user.is_anonymous ?? false,
        totalLists: totalListsResult.count ?? 0,
        totalVotes: totalVotesForStatsResult.count ?? 0,
        totalCompleted: (totalCompletedResult as { count: number | null }).count ?? 0,
        sharedLists: sharedListsResult.count ?? 0,
      }}
      listDetails={listDetails}
    >
      {children}
    </TabShell>
  );
}
