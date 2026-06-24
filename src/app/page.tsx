import Header from "@/components/layout/Header";
import DashboardClient from "@/components/dashboard/DashboardClient";

export default function DashboardPage() {
  return (
    <div className="flex flex-col flex-1 overflow-auto">
      <Header title={<><span className="md:hidden">AWS IAM</span><span className="hidden md:inline">AWS IAM Overview</span></>} />
      <DashboardClient />
    </div>
  );
}
