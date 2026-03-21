import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import ListDetailClient from "@/components/ListDetailClient";
import type { Item, List } from "@/lib/supabase/types";
import type { MemberWithProfile } from "@/components/ShareModal";

export default async function ListPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: listData } = await supabase
    .from("lists")
    .select("*")
    .eq("id", id)
    .single();

  if (!listData) notFound();

  const list = listData as List;
  const isOwner = list.owner_id === user.id;

  // Check access: owner or member
  if (!isOwner) {
    const { data: membership } = await supabase
      .from("list_members")
      .select("list_id")
      .eq("list_id", id)
      .eq("user_id", user.id)
      .single();

    if (!membership) redirect("/home");
  }

  // Fetch all items
  const { data: itemsData } = await supabase
    .from("items")
    .select("*")
    .eq("list_id", id)
    .order("total_votes", { ascending: false });

  const items = (itemsData ?? []) as Item[];

  // Check if user already voted today in this list
  const today = new Date().toISOString().split("T")[0];
  const { data: todayVote } = await supabase
    .from("votes")
    .select("item_id")
    .eq("user_id", user.id)
    .eq("list_id", id)
    .eq("voted_date", today)
    .single();

  // Fetch list members with their profiles (only owner can see all members)
  let members: MemberWithProfile[] = [];
  if (isOwner) {
    const { data: membersData } = await supabase
      .from("list_members")
      .select("user_id, profiles(username)")
      .eq("list_id", id);

    members = (membersData ?? []).map((m) => ({
      user_id: m.user_id,
      username:
        (m.profiles as { username: string } | null)?.username ?? "Usuario",
    }));
  }

  return (
    <ListDetailClient
      list={list}
      initialItems={items}
      userId={user.id}
      todayVotedItemId={todayVote?.item_id ?? null}
      isOwner={isOwner}
      initialMembers={members}
    />
  );
}
