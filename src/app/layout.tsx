import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RankIt",
  description: "Listas colaborativas votadas. Vota, rankea, decide.",
};

export const viewport: Viewport = {
  themeColor: "#0a0a0f",
  colorScheme: "dark",
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className="h-full">
      <body className="h-full bg-bg text-text antialiased">{children}</body>
    </html>
  );
}
