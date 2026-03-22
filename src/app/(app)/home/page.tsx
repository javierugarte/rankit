import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import HomeClient from "@/components/HomeClient";
import CreateListButton from "@/components/CreateListButton";
import type { List } from "@/lib/supabase/types";

export default async function HomePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Ensure profile exists (trigger may have failed on signup)
  const { error: profileError } = await supabase.from("profiles").upsert(
    { id: user.id, username: user.email?.split("@")[0] ?? "user" },
    { onConflict: "id", ignoreDuplicates: true }
  );
  if (profileError) console.error("Profile upsert failed:", profileError);

  // Owned lists
  const { data: ownedLists } = await supabase
    .from("lists")
    .select("*")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });

  // Member list IDs
  const { data: memberListIds } = await supabase
    .from("list_members")
    .select("list_id")
    .eq("user_id", user.id);

  const memberIds = (memberListIds ?? []).map((m) => m.list_id);

  // Lists where user is member (not owner) — include owner profile for sharing label
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

  const allLists: List[] = [...(ownedLists ?? []), ...memberLists];
  const listIds = allLists.map((l) => l.id);

  if (listIds.length === 0) {
    return (
      <div className="max-w-lg mx-auto px-4 pt-12 pb-24">
        <div className="mb-8">
          <h1
            className="text-3xl font-bold"
            style={{ fontFamily: "Georgia, serif", color: "#c8a96e" }}
          >
            RankIt
          </h1>
          <p className="text-muted text-sm mt-1">Tus listas</p>
        </div>
        <div className="text-center py-20">
          <p className="text-4xl mb-4">🎬</p>
          <p className="text-muted text-base">Aún no tienes listas.</p>
          <p className="text-muted text-sm mt-1">
            Pulsa el <span className="text-gold font-bold">+</span> para crear
            la primera.
          </p>
        </div>
        <CreateListButton userId={user.id} />
      </div>
    );
  }

  const today = new Date().toISOString().split("T")[0];

  // Fetch all data in parallel
  const [itemsResult, membersResult, todayVotesResult] = await Promise.all([
    supabase
      .from("items")
      .select("list_id, total_votes, title")
      .in("list_id", listIds)
      .eq("completed", false)
      .order("total_votes", { ascending: false }),
    supabase
      .from("list_members")
      .select("list_id, user_id, profiles(username)")
      .in("list_id", listIds),
    supabase
      .from("votes")
      .select("list_id")
      .eq("user_id", user.id)
      .in("list_id", listIds)
      .eq("voted_date", today),
  ]);

  // Build maps from items
  const totalVotesMap: Record<string, number> = {};
  const leaderMap: Record<string, string> = {};

  for (const item of itemsResult.data ?? []) {
    totalVotesMap[item.list_id] =
      (totalVotesMap[item.list_id] ?? 0) + item.total_votes;
    if (!(item.list_id in leaderMap) && item.total_votes > 0) {
      leaderMap[item.list_id] = item.title;
    }
  }

  // Sharing label per list (excluding current user)
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
      // List shared with the current user — show owner's name
      sharingMap[list.id] = `De ${ownerUsernameMap[list.id] ?? "alguien"}`;
    } else {
      const others = otherMembersPerList[list.id] ?? [];
      if (others.length === 0) sharingMap[list.id] = "Privado";
      else if (others.length === 1) sharingMap[list.id] = `Con ${others[0]}`;
      else sharingMap[list.id] = `Con ${others.length} personas`;
    }
  }

  // Voted today set
  const votedTodaySet = new Set(
    (todayVotesResult.data ?? []).map((r) => r.list_id)
  );

  return (
    <HomeClient
      lists={allLists}
      sharingMap={sharingMap}
      totalVotesMap={totalVotesMap}
      votedTodayIds={[...votedTodaySet]}
      leaderMap={leaderMap}
      userId={user.id}
    />
  );
}
