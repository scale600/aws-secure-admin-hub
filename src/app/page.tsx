import Header from "@/components/layout/Header";
import Badge from "@/components/ui/Badge";
import {
  KeyRound,
  Activity,
  Server,
  ShieldCheck,
  TrendingUp,
  Clock,
} from "lucide-react";

const summaryCards = [
  {
    label: "Access Requests",
    value: "—",
    sub: "Today",
    icon: KeyRound,
    badge: "live" as const,
    color: "text-orange-500",
    bg: "bg-orange-50 dark:bg-orange-900/20",
  },
  {
    label: "Lambda Invocations",
    value: "—",
    sub: "Last 24h",
    icon: Activity,
    badge: "live" as const,
    color: "text-green-500",
    bg: "bg-green-50 dark:bg-green-900/20",
  },
  {
    label: "EC2 Instances",
    value: "1",
    sub: "1 stopped",
    icon: Server,
    badge: "demo" as const,
    color: "text-blue-500",
    bg: "bg-blue-50 dark:bg-blue-900/20",
  },
  {
    label: "Security Score",
    value: "92",
    sub: "/ 100",
    icon: ShieldCheck,
    badge: "demo" as const,
    color: "text-purple-500",
    bg: "bg-purple-50 dark:bg-purple-900/20",
  },
];

const recentActivity = [
  { user: "guest", action: "Access request submitted", resource: "i-0abc1234", time: "2m ago" },
  { user: "richard", action: "IAM policy generated", resource: "EC2:ReadOnly", time: "15m ago" },
  { user: "guest", action: "CloudTrail events viewed", resource: "us-east-1", time: "32m ago" },
];

export default function DashboardPage() {
  return (
    <div className="flex flex-col flex-1 overflow-auto">
      <Header title="Admin Dashboard" />

      <main className="flex-1 p-6 space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {summaryCards.map(({ label, value, sub, icon: Icon, badge, color, bg }) => (
            <div
              key={label}
              className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5"
            >
              <div className="flex items-start justify-between mb-3">
                <div className={`p-2 rounded-lg ${bg}`}>
                  <Icon size={20} className={color} />
                </div>
                <Badge type={badge} />
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {value}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                {label}
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                {sub}
              </p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Chart placeholder */}
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                API Gateway Requests
              </h2>
              <Badge type="live" />
            </div>
            <div className="h-40 flex items-center justify-center text-gray-400 dark:text-gray-600 text-sm border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg">
              <TrendingUp size={20} className="mr-2" />
              CloudWatch data — Phase 2
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                Recent Activity
              </h2>
              <Badge type="demo" />
            </div>
            <ul className="space-y-3">
              {recentActivity.map((item, i) => (
                <li key={i} className="flex items-start gap-3">
                  <Clock size={14} className="mt-0.5 text-gray-400 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm text-gray-700 dark:text-gray-300 truncate">
                      <span className="font-medium">{item.user}</span>{" "}
                      {item.action}
                    </p>
                    <p className="text-xs text-gray-400">
                      {item.resource} · {item.time}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* LIVE/DEMO legend */}
        <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
          <span className="font-medium">Legend:</span>
          <span className="flex items-center gap-1.5">
            <Badge type="live" /> Real AWS API call
          </span>
          <span className="flex items-center gap-1.5">
            <Badge type="demo" /> Simulated / mock data
          </span>
        </div>
      </main>
    </div>
  );
}
