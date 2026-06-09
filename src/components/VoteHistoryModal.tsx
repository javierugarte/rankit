"use client";

import { X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import type { Item } from "@/lib/supabase/types";
import type { MemberWithProfile } from "./ShareModal";
import { userColor } from "./VoteBreakdown";

export interface ListVote {
  item_id: string;
  user_id: string;
  voted_date: string;
}

interface Props {
  votes: ListVote[];
  items: Item[];
  participants: MemberWithProfile[];
  onClose: () => void;
}

export default function VoteHistoryModal({ votes, items, participants, onClose }: Props) {
  const t = useTranslations("voteHistory");
  const locale = useLocale();
  const itemNames = new Map(items.map((item) => [item.id, item.title]));
  const participantNames = new Map(
    participants.map((participant) => [participant.user_id, participant.username])
  );
  const votesByDate = new Map<string, ListVote[]>();
  for (const vote of [...votes].sort((a, b) => b.voted_date.localeCompare(a.voted_date))) {
    votesByDate.set(vote.voted_date, [...(votesByDate.get(vote.voted_date) ?? []), vote]);
  }

  function formatDate(date: string) {
    const [year, month, day] = date.split("-").map(Number);
    return new Intl.DateTimeFormat(locale, {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(new Date(year, month - 1, day));
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center"
      style={{ backgroundColor: "rgba(0,0,0,0.7)" }}
      onClick={onClose}
    >
      <div
        className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-t-3xl border-t border-border bg-surface-2 p-6"
        style={{ paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))" }}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mx-auto mb-6 h-1 w-10 rounded-full bg-border" />
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-text">{t("title")}</h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-surface text-muted hover:text-text"
            aria-label={t("close")}
          >
            <X size={16} />
          </button>
        </div>

        {votes.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted">{t("empty")}</p>
        ) : (
          <div className="space-y-5">
            {[...votesByDate.entries()].map(([date, dayVotes]) => (
              <section key={date}>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gold">
                  {formatDate(date)}
                </h3>
                <div className="space-y-2">
                  {dayVotes.map((vote) => {
                    const username = participantNames.get(vote.user_id) ?? t("unknownUser");
                    const itemName = itemNames.get(vote.item_id) ?? t("unknownItem");
                    return (
                      <div
                        key={`${vote.user_id}-${vote.voted_date}`}
                        className="flex items-start gap-3 rounded-xl border border-border bg-surface p-3"
                      >
                        <span
                          className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
                          style={{ backgroundColor: userColor(vote.user_id) }}
                        />
                        <p className="text-sm text-muted">
                          <span className="font-semibold text-text">{username}</span>{" "}
                          {t("votedFor")}{" "}
                          <span className="font-semibold text-gold">{itemName}</span>
                        </p>
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
