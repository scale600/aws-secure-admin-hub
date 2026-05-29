import Header from "@/components/layout/Header";
import DashboardClient from "@/components/dashboard/DashboardClient";
import { api } from "@/lib/api";

// Pre-fetch on server for fast LCP
async function getInitialData() {
  try {
    const [reqData, metData] = await Promise.all([
      api.getRequests(),
      api.getMetrics(),
    ]);
    return { requests: reqData.items, metrics: metData.metrics };
  } catch {
    return { requests: [], metrics: null };
  }
}

export default async function DashboardPage() {
  const initial = await getInitialData();

  return (
    <div className="flex flex-col flex-1 overflow-auto">
      <Header title="Admin Dashboard" />
      <DashboardClient initial={initial} />
    </div>
  );
}
