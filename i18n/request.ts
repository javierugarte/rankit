import { getRequestConfig } from "next-intl/server";
import { cookies, headers } from "next/headers";

export type Locale = "es" | "en" | "fr" | "it" | "pt-BR";
export const locales: Locale[] = ["es", "en", "fr", "it", "pt-BR"];
export const defaultLocale: Locale = "es";

export function resolveLocale(
  cookieValue: string | undefined,
  acceptLanguage: string
): Locale {
  if (cookieValue === "en" || cookieValue === "es" || cookieValue === "fr" || cookieValue === "it" || cookieValue === "pt-BR") return cookieValue;
  // Detect from Accept-Language header
  const tags = acceptLanguage.split(",").map((s) => s.split(";")[0].trim());
  for (const tag of tags) {
    if (tag === "pt-BR" || tag === "pt") return "pt-BR";
    if (tag === "en" || tag.startsWith("en-")) return "en";
    if (tag === "fr" || tag.startsWith("fr-")) return "fr";
    if (tag === "it" || tag.startsWith("it-")) return "it";
  }
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
