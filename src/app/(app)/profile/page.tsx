import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import ProfileClient from "@/components/ProfileClient";
import type { Profile } from "@/lib/supabase/types";

export default async function ProfilePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profileData } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const profile = profileData as Profile | null;

  const { count: totalLists } = await supabase
    .from("lists")
    .select("*", { count: "exact", head: true })
    .eq("owner_id", user.id);

  const { count: totalVotes } = await supabase
    .from("votes")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id);

  const { count: totalCompleted } = await supabase
    .from("items")
    .select("list_id", { count: "exact", head: true })
    .eq("completed", true)
    .in(
      "list_id",
      await supabase
        .from("lists")
        .select("id")
        .eq("owner_id", user.id)
        .then(({ data }) => (data ?? []).map((l) => l.id))
    );

  const { count: sharedLists } = await supabase
    .from("list_members")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id);

  return (
    <ProfileClient
      profile={profile}
      userId={user.id}
      email={user.email ?? ""}
      totalLists={totalLists ?? 0}
      totalVotes={totalVotes ?? 0}
      totalCompleted={totalCompleted ?? 0}
      sharedLists={sharedLists ?? 0}
    />
  );
}
