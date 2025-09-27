import { AppSidebar } from "@/components/AppSidebar";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppSidebar>
      <div className="p-4 md:p-6">
        {children}
      </div>
    </AppSidebar>
  );
}