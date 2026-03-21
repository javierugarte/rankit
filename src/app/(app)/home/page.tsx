import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import ListCard from "@/components/ListCard";
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

  // Lists where user is member (not owner)
  let memberLists: List[] = [];
  if (memberIds.length > 0) {
    const { data } = await supabase
      .from("lists")
      .select("*")
      .in("id", memberIds)
      .neq("owner_id", user.id)
      .order("created_at", { ascending: false });
    memberLists = data ?? [];
  }

  const allLists: List[] = [...(ownedLists ?? []), ...memberLists];

  // Item counts per list
  const listIds = allLists.map((l) => l.id);
  const countMap: Record<string, number> = {};

  if (listIds.length > 0) {
    const { data: itemCounts } = await supabase
      .from("items")
      .select("list_id")
      .in("list_id", listIds)
      .eq("completed", false);

    for (const item of itemCounts ?? []) {
      countMap[item.list_id] = (countMap[item.list_id] ?? 0) + 1;
    }
  }

  return (
    <div className="max-w-lg mx-auto px-4 pt-12 pb-24">
      {/* Header */}
      <div className="mb-8">
        <h1
          className="text-3xl font-bold"
          style={{ fontFamily: "Georgia, serif", color: "#c8a96e" }}
        >
          RankIt
        </h1>
        <p className="text-muted text-sm mt-1">Tus listas</p>
      </div>

      {/* Lists */}
      {allLists.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-4xl mb-4">🎬</p>
          <p className="text-muted text-base">Aún no tienes listas.</p>
          <p className="text-muted text-sm mt-1">
            Pulsa el <span className="text-gold font-bold">+</span> para crear
            la primera.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {allLists.map((list) => (
            <ListCard
              key={list.id}
              list={list}
              itemCount={countMap[list.id] ?? 0}
            />
          ))}
        </div>
      )}

      <CreateListButton userId={user.id} />
    </div>
  );
}
