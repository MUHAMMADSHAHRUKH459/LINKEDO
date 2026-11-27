import { Sidebar } from "@/components/shared/Sidebar";
import { Topbar } from "@/components/shared/Topbar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="dashboard-shell flex min-h-screen flex-col md:h-screen md:flex-row">
      <Sidebar />
      <div className="flex min-h-0 flex-1 flex-col md:h-full md:overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-y-auto px-4 py-5 sm:px-6 sm:py-7 lg:px-8">
          <div className="dashboard-page mx-auto w-full max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
