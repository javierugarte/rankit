"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { X, Trash2, Search, Loader2 } from "lucide-react";
import type { Item } from "@/lib/supabase/types";
import { getService, type ExternalResult } from "@/lib/services";
import Image from "next/image";

interface Props {
  listId: string;
  userId: string;
  listType?: string | null;
  onClose: () => void;
  onSaved: (item: Item) => void;
  editItem?: Item;
  onDelete?: () => void;
}

export default function AddItemModal({
  listId,
  userId,
  listType,
  onClose,
  onSaved,
  editItem,
  onDelete,
}: Props) {
  const [title, setTitle] = useState(editItem?.title ?? "");
  const [category, setCategory] = useState(editItem?.category ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Autocomplete state
  const service = getService(listType);
  const [results, setResults] = useState<ExternalResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  const initialSelected: ExternalResult | null = (() => {
    if (!editItem || !editItem.external_id) return null;
    const data = editItem.external_data as Record<string, unknown> | null;
    return {
      external_id: editItem.external_id as string,
      title: editItem.title,
      poster_path: (data?.poster_path as string | undefined) ?? null,
      genre: (data?.genre as string | undefined) ?? null,
      year: (data?.year as string | undefined) ?? null,
      overview: (data?.overview as string | undefined) ?? null,
      type: null,
    };
  })();

  const [selectedResult, setSelectedResult] = useState<ExternalResult | null>(initialSelected);
  const [externalId, setExternalId] = useState<string | null>(
    (editItem?.external_id as string | null) ?? null
  );
  const [externalData, setExternalData] = useState<Record<string, unknown> | null>(
    (editItem?.external_data as Record<string, unknown> | null) ?? null
  );

  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const supabase = createClient();

  const doSearch = useCallback(
    async (query: string) => {
      if (!service || query.trim().length < 2) {
        setResults([]);
        setShowDropdown(false);
        return;
      }
      setSearching(true);
      try {
        const res = await fetch(
          `${service.searchEndpoint}?q=${encodeURIComponent(query)}`
        );
        if (res.ok) {
          const data: ExternalResult[] = await res.json();
          setResults(data);
          setShowDropdown(data.length > 0);
        }
      } finally {
        setSearching(false);
      }
    },
    [service]
  );

  useEffect(() => {
    // Only search if no result is already selected and service is active
    if (!service || selectedResult) return;
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => doSearch(title), 350);
    return () => {
      if (searchTimeout.current) clearTimeout(searchTimeout.current);
    };
  }, [title, service, selectedResult, doSearch]);

  function selectResult(result: ExternalResult) {
    setSelectedResult(result);
    setTitle(result.title);
    setCategory(
      [result.genre, result.year].filter(Boolean).join(" • ")
    );
    setExternalId(result.external_id);
    setExternalData({
      genre: result.genre,
      year: result.year,
      poster_path: result.poster_path,
      overview: result.overview,
    });
    setShowDropdown(false);
    setResults([]);
  }

  function clearSelection() {
    setSelectedResult(null);
    setExternalId(null);
    setExternalData(null);
    setTitle("");
    setCategory("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;

    setLoading(true);
    setError(null);

    if (editItem) {
      const { data, error } = await supabase
        .from("items")
        .update({
          title: title.trim(),
          category: category.trim() || null,
          external_id: externalId,
          external_data: externalData,
        })
        .eq("id", editItem.id)
        .select()
        .single();

      if (error) {
        setError(error.message);
        setLoading(false);
      } else {
        onSaved(data);
        onClose();
      }
    } else {
      const { data, error } = await supabase
        .from("items")
        .insert({
          list_id: listId,
          title: title.trim(),
          category: category.trim() || null,
          external_id: externalId,
          external_data: externalData,
          added_by: userId,
          total_votes: 0,
        })
        .select()
        .single();

      if (error) {
        setError(error.message);
        setLoading(false);
      } else {
        onSaved(data);
        onClose();
      }
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center"
      style={{ backgroundColor: "rgba(0,0,0,0.7)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full max-w-lg bg-surface-2 rounded-t-3xl p-6 border-t border-border"
        style={{ paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))" }}
      >
        {/* Handle */}
        <div className="w-10 h-1 bg-border rounded-full mx-auto mb-6" />

        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-text">
            {editItem ? "Editar item" : "Anadir item"}
          </h2>
          <div className="flex items-center gap-2">
            {editItem && onDelete && (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="w-8 h-8 rounded-full bg-surface border border-border flex items-center justify-center text-muted hover:text-red-400 hover:bg-red-400/10 transition-colors"
                title="Eliminar item"
              >
                <Trash2 size={14} />
              </button>
            )}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-surface border border-border flex items-center justify-center text-muted hover:text-text"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {confirmDelete && (
          <div
            className="mb-4 p-4 rounded-xl border"
            style={{
              backgroundColor: "rgba(239, 68, 68, 0.08)",
              borderColor: "rgba(239, 68, 68, 0.3)",
            }}
          >
            <p className="text-sm text-text mb-3">
              Eliminar este item? Esta accion no se puede deshacer.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="flex-1 py-2 rounded-lg border border-border text-muted text-sm hover:text-text transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={onDelete}
                className="flex-1 py-2 rounded-lg text-sm font-semibold text-white transition-colors"
                style={{ backgroundColor: "#ef4444" }}
              >
                Eliminar
              </button>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title field — with autocomplete if service available */}
          <div className="relative">
            <label className="block text-xs text-muted mb-2 uppercase tracking-wider">
              {service ? "Buscar" : "Titulo"}
            </label>

            {/* Selected result preview */}
            {selectedResult ? (
              <div
                className="flex items-center gap-3 p-3 rounded-xl border"
                style={{
                  backgroundColor: "rgba(200, 169, 110, 0.08)",
                  borderColor: "rgba(200, 169, 110, 0.3)",
                }}
              >
                {selectedResult.poster_path && (
                  <Image
                    src={`https://image.tmdb.org/t/p/w92${selectedResult.poster_path}`}
                    alt={selectedResult.title}
                    width={36}
                    height={54}
                    className="rounded object-cover shrink-0"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-text text-sm font-medium truncate">
                    {selectedResult.title}
                  </p>
                  <p className="text-muted text-xs mt-0.5">
                    {[selectedResult.genre, selectedResult.year]
                      .filter(Boolean)
                      .join(" • ")}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={clearSelection}
                  className="text-muted hover:text-text shrink-0"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <div className="relative">
                {service && (
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none">
                    {searching ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Search size={16} />
                    )}
                  </div>
                )}
                <input
                  type="text"
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    if (selectedResult) setSelectedResult(null);
                  }}
                  required
                  autoFocus
                  placeholder={
                    service
                      ? service.placeholder
                      : "Breaking Bad, Tokio, Ramen Nakamura..."
                  }
                  className="w-full bg-surface border border-border rounded-xl py-3 text-text placeholder-muted focus:outline-none focus:border-gold transition-colors"
                  style={{ paddingLeft: service ? "2.5rem" : "1rem", paddingRight: "1rem" }}
                />
              </div>
            )}

            {/* Autocomplete dropdown */}
            {showDropdown && results.length > 0 && !selectedResult && (
              <div
                className="absolute left-0 right-0 top-full mt-1 rounded-xl border overflow-hidden z-10 shadow-xl"
                style={{
                  backgroundColor: "#1a1a24",
                  borderColor: "#2a2a38",
                }}
              >
                {results.map((r) => (
                  <button
                    key={r.external_id}
                    type="button"
                    onClick={() => selectResult(r)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-white/5 transition-colors text-left"
                  >
                    {r.poster_path ? (
                      <Image
                        src={`https://image.tmdb.org/t/p/w92${r.poster_path}`}
                        alt={r.title}
                        width={28}
                        height={42}
                        className="rounded object-cover shrink-0"
                      />
                    ) : (
                      <div
                        className="w-7 h-10 rounded shrink-0 flex items-center justify-center text-muted text-xs"
                        style={{ backgroundColor: "#2a2a38" }}
                      >
                        ?
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-text text-sm font-medium truncate">
                        {r.title}
                      </p>
                      <p className="text-muted text-xs">
                        {[r.genre, r.year].filter(Boolean).join(" • ")}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs text-muted mb-2 uppercase tracking-wider">
              Categoria{" "}
              <span className="normal-case text-muted/60">(opcional)</span>
            </label>
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Drama, Japon, Restaurante..."
              className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-text placeholder-muted focus:outline-none focus:border-gold transition-colors"
            />
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-xl border border-border text-muted text-sm font-medium hover:text-text transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !title.trim()}
              className="flex-1 py-3 rounded-xl text-bg text-sm font-semibold transition-opacity disabled:opacity-50"
              style={{ backgroundColor: "#c8a96e" }}
            >
              {loading
                ? editItem
                  ? "Guardando..."
                  : "Anadiendo..."
                : editItem
                ? "Guardar"
                : "Anadir"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
