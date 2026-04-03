import { getRequestConfig } from "next-intl/server";
import { cookies, headers } from "next/headers";

export type Locale = "es" | "en";
export const locales: Locale[] = ["es", "en"];
export const defaultLocale: Locale = "es";

export function resolveLocale(
  cookieValue: string | undefined,
  acceptLanguage: string
): Locale {
  if (cookieValue === "en" || cookieValue === "es") return cookieValue;
  // Detect from Accept-Language: prefer English if it comes before Spanish
  const lang = acceptLanguage.split(",")[0]?.split("-")[0]?.trim() ?? "";
  return lang === "en" ? "en" : "es";
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
