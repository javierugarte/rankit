import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import LogoutButton from "@/components/LogoutButton";
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

  const initials = (profile?.username ?? user.email ?? "?")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="max-w-lg mx-auto px-4 pt-12 pb-24">
      {/* Header */}
      <h2 className="text-xl font-semibold text-text mb-8">Perfil</h2>

      {/* Avatar + Name */}
      <div className="flex flex-col items-center mb-10">
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold text-bg mb-4"
          style={{ backgroundColor: "#c8a96e" }}
        >
          {initials}
        </div>
        <h3 className="text-xl font-semibold text-text">
          {profile?.username ?? "Usuario"}
        </h3>
        <p className="text-muted text-sm mt-1">{user.email}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-surface border border-border rounded-xl p-4 text-center">
          <p
            className="text-3xl font-bold"
            style={{ color: "#c8a96e", fontFamily: "Georgia, serif" }}
          >
            {totalLists ?? 0}
          </p>
          <p className="text-muted text-sm mt-1">Listas creadas</p>
        </div>
        <div className="bg-surface border border-border rounded-xl p-4 text-center">
          <p
            className="text-3xl font-bold"
            style={{ color: "#c8a96e", fontFamily: "Georgia, serif" }}
          >
            {totalVotes ?? 0}
          </p>
          <p className="text-muted text-sm mt-1">Votos emitidos</p>
        </div>
        <div className="bg-surface border border-border rounded-xl p-4 text-center">
          <p
            className="text-3xl font-bold"
            style={{ color: "#c8a96e", fontFamily: "Georgia, serif" }}
          >
            {totalCompleted ?? 0}
          </p>
          <p className="text-muted text-sm mt-1">Ítems vistos</p>
        </div>
        <div className="bg-surface border border-border rounded-xl p-4 text-center">
          <p
            className="text-3xl font-bold"
            style={{ color: "#c8a96e", fontFamily: "Georgia, serif" }}
          >
            {sharedLists ?? 0}
          </p>
          <p className="text-muted text-sm mt-1">Listas compartidas</p>
        </div>
      </div>

      {/* Actions */}
      <div className="space-y-3">
        <LogoutButton />
      </div>
    </div>
  );
}
