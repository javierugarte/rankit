import { getRequestConfig } from "next-intl/server";
import { cookies, headers } from "next/headers";

export type Locale = "es" | "en" | "fr";
export const locales: Locale[] = ["es", "en", "fr"];
export const defaultLocale: Locale = "es";

export function resolveLocale(
  cookieValue: string | undefined,
  acceptLanguage: string
): Locale {
  if (cookieValue === "en" || cookieValue === "es" || cookieValue === "fr") return cookieValue;
  // Detect from Accept-Language header
  const lang = acceptLanguage.split(",")[0]?.split("-")[0]?.trim() ?? "";
  if (lang === "en") return "en";
  if (lang === "fr") return "fr";
  return "es";
}

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const headerStore = await headers();

  const locale = resolveLocale(
    cookieStore.get("NEXT_LOCALE")?.value,
    headerStore.get("accept-language") ?? ""
  );

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
