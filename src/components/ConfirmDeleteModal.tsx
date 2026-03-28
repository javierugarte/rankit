"use client";

import { useState } from "react";
import type { ReactNode } from "react";

interface Props {
  emoji: string;
  title: string;
  itemName: string;
  message?: ReactNode;
  confirmLabel?: string;
  onConfirm: () => Promise<void> | void;
  onCancel: () => void;
}

export default function ConfirmDeleteModal({
  emoji,
  title,
  itemName,
  message,
  confirmLabel,
  onConfirm,
  onCancel,
}: Props) {
  const [deleting, setDeleting] = useState(false);

  async function handleConfirm() {
    setDeleting(true);
    await onConfirm();
  }

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center"
      style={{ backgroundColor: "rgba(0,0,0,0.7)" }}
      onClick={(e) =>
        e.target === e.currentTarget && !deleting && onCancel()
      }
    >
      <div
        className="w-full max-w-lg bg-surface-2 rounded-t-3xl p-6 border-t border-border"
        style={{ paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))" }}
      >
        <div className="w-10 h-1 bg-border rounded-full mx-auto mb-6" />

        <div className="text-center mb-6">
          <p className="text-3xl mb-3">{emoji}</p>
          <h2 className="text-lg font-semibold text-text mb-1">{title}</h2>
          <p className="text-muted text-sm">
            {message ?? (
              <>
                ¿Seguro que quieres eliminar{" "}
                <span className="text-text font-medium">{itemName}</span>? Esta
                acción no se puede deshacer.
              </>
            )}
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={deleting}
            className="flex-1 py-3 rounded-xl border border-border text-muted text-sm font-medium hover:text-text transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={deleting}
            className="flex-1 py-3 rounded-xl text-sm font-semibold transition-opacity disabled:opacity-50"
            style={{ backgroundColor: "#ef4444", color: "white" }}
          >
            {deleting
            ? confirmLabel
              ? `${confirmLabel}...`
              : "Eliminando..."
            : (confirmLabel ?? "Eliminar")}
          </button>
        </div>
      </div>
    </div>
  );
}
