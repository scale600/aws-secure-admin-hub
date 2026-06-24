import Header from "@/components/layout/Header";
import DashboardClient from "@/components/dashboard/DashboardClient";

export default function DashboardPage() {
  return (
    <div className="flex flex-col flex-1 overflow-auto">
      <Header title="Overview" />
      <DashboardClient />
    </div>
  );
}
