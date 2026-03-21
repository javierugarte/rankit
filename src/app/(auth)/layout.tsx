export const dynamic = "force-dynamic";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-full flex items-center justify-center bg-bg px-4">
      {children}
    </div>
  );
}
