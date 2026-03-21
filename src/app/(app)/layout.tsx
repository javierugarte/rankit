import BottomNav from "@/components/BottomNav";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-full bg-bg">
      <main className="flex-1 pb-20" style={{ paddingTop: "env(safe-area-inset-top)" }}>{children}</main>
      <BottomNav />
    </div>
  );
}
