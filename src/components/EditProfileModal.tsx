"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { Loader2, Camera, KeyRound, ChevronDown, Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";

const LANGUAGES = [
  { code: "en", flag: "🇬🇧", label: "English" },
  { code: "es", flag: "🇪🇸", label: "Español" },
  { code: "fr", flag: "🇫🇷", label: "Français" },
  { code: "it", flag: "🇮🇹", label: "Italiano" },
] as const;

interface Props {
  userId: string;
  currentUsername: string;
  currentAvatarUrl: string | null;
  currentLocale: string;
  onClose: () => void;
  onSaved: (username: string, avatarUrl: string | null) => void;
  onChangePassword?: () => void;
}

export default function EditProfileModal({
  userId,
  currentUsername,
  currentAvatarUrl,
  currentLocale,
  onClose,
  onSaved,
  onChangePassword,
}: Props) {
  const [username, setUsername] = useState(currentUsername);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [selectedLocale, setSelectedLocale] = useState(currentLocale);
  const [langOpen, setLangOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const langRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();
  const t = useTranslations("editProfile");
  const router = useRouter();

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (langRef.current && !langRef.current.contains(e.target as Node)) {
        setLangOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const displayAvatar = avatarPreview ?? currentAvatarUrl;
  const initials = (username || currentUsername).slice(0, 2).toUpperCase();

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError(t("errorFileTooLarge"));
      return;
    }
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
    setError("");
  }

  function handleLocaleChange(locale: string) {
    document.cookie = `NEXT_LOCALE=${locale}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
    setSelectedLocale(locale);
    setLangOpen(false);
    router.refresh();
  }

  async function handleSave() {
    const trimmed = username.trim();
    if (trimmed.length < 3) {
      setError(t("errorTooShort"));
      return;
    }
    if (/\s/.test(trimmed)) {
      setError(t("errorNoSpaces"));
      return;
    }

    setSaving(true);
    setError("");

    let newAvatarUrl = currentAvatarUrl;

    if (avatarFile) {
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(`${userId}/avatar`, avatarFile, {
          upsert: true,
          contentType: avatarFile.type,
        });

      if (uploadError) {
        setError(t("errorUpload"));
        setSaving(false);
        return;
      }

      newAvatarUrl = supabase.storage
        .from("avatars")
        .getPublicUrl(`${userId}/avatar`).data.publicUrl;
    }

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ username: trimmed, avatar_url: newAvatarUrl })
      .eq("id", userId);

    setSaving(false);

    if (updateError) {
      if (updateError.code === "23505") {
        setError(t("errorTaken"));
      } else {
        setError(t("errorSave"));
      }
      return;
    }

    onSaved(trimmed, newAvatarUrl);
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center"
      style={{ backgroundColor: "rgba(0,0,0,0.7)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full max-w-lg bg-surface-2 rounded-t-3xl border-t border-border"
        style={{ paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))" }}
      >
        <div className="p-6">
          <div className="w-10 h-1 bg-border rounded-full mx-auto mb-6" />
          <h2 className="text-lg font-semibold text-text mb-6">{t("title")}</h2>

          {/* Avatar picker */}
          <div className="flex justify-center mb-6">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="relative w-20 h-20 rounded-full overflow-hidden transition-transform active:scale-95 active:transition-none"
              aria-label={t("changePhoto")}
            >
              <div
                className="absolute inset-0 flex items-center justify-center text-2xl font-bold"
                style={{ backgroundColor: "#c8a96e", color: "#0a0a0f" }}
              >
                {initials}
              </div>
              {displayAvatar && (
                <Image
                  src={displayAvatar}
                  alt="Avatar"
                  fill
                  className="object-cover"
                  unoptimized={!!avatarPreview}
                />
              )}
              <div
                className="absolute inset-0 flex items-center justify-center"
                style={{ backgroundColor: "rgba(0,0,0,0.45)" }}
              >
                <Camera size={20} color="white" />
              </div>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          {/* Username */}
          <div className="mb-5">
            <label className="text-xs text-muted uppercase tracking-wide mb-2 block">
              {t("usernameLabel")}
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                setError("");
              }}
              placeholder={t("usernamePlaceholder")}
              className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-base text-text placeholder:text-muted focus:outline-none focus:border-gold/50"
              autoCorrect="off"
              autoCapitalize="none"
            />
          </div>

          {/* Language switcher */}
          <div className="mb-5" ref={langRef}>
            <label className="text-xs text-muted uppercase tracking-wide mb-2 block">
              {t("language")}
            </label>
            <div className="relative">
              {/* Trigger */}
              <button
                onClick={() => setLangOpen((o) => !o)}
                className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-border bg-surface text-sm text-text active:scale-[0.98] active:transition-none transition-all"
              >
                <span className="flex items-center gap-2">
                  <span>{LANGUAGES.find((l) => l.code === selectedLocale)?.flag}</span>
                  <span>{LANGUAGES.find((l) => l.code === selectedLocale)?.label}</span>
                </span>
                <ChevronDown
                  size={16}
                  className="text-muted transition-transform duration-200"
                  style={{ transform: langOpen ? "rotate(180deg)" : "rotate(0deg)" }}
                />
              </button>

              {/* Dropdown */}
              {langOpen && (
                <div
                  className="absolute left-0 right-0 mt-1 rounded-xl border border-border overflow-hidden z-10"
                  style={{ backgroundColor: "#1a1a26" }}
                >
                  {LANGUAGES.map(({ code, flag, label }) => {
                    const active = selectedLocale === code;
                    return (
                      <button
                        key={code}
                        onClick={() => handleLocaleChange(code)}
                        className="w-full flex items-center justify-between px-4 py-3 text-sm transition-colors"
                        style={{ color: active ? "#c8a96e" : "#8888a0" }}
                      >
                        <span className="flex items-center gap-2">
                          <span>{flag}</span>
                          <span>{label}</span>
                        </span>
                        {active && <Check size={14} />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {error && <p className="text-red-400 text-xs mb-4">{error}</p>}

          {/* Change password */}
          {onChangePassword && (
            <button
              onClick={onChangePassword}
              className="w-full flex items-center gap-3 py-3 px-4 rounded-xl border border-border text-muted text-sm hover:text-text hover:border-border/80 transition-colors mb-4 active:scale-[0.98] active:transition-none"
            >
              <KeyRound size={16} />
              {t("changePassword")}
            </button>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={saving}
              className="flex-1 py-3 rounded-xl border border-border text-muted text-sm font-medium hover:text-text transition-colors disabled:opacity-50 active:scale-[0.97] active:transition-none"
            >
              {t("cancel")}
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 py-3 rounded-xl text-sm font-semibold transition-opacity disabled:opacity-50 flex items-center justify-center gap-2 active:scale-[0.97] active:transition-none"
              style={{ backgroundColor: "#c8a96e", color: "#0a0a0f" }}
            >
              {saving ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                t("save")
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
