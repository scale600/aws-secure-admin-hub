"use client";

import { useEffect, useState } from "react";
import { api, type AccessRequest, type CloudWatchMetrics } from "@/lib/api";
import Badge from "@/components/ui/Badge";
import {
  KeyRound,
  Activity,
  Server,
  ShieldCheck,
  TrendingUp,
  Clock,
  RefreshCw,
} from "lucide-react";

export default function DashboardClient() {
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [metrics, setMetrics] = useState<CloudWatchMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [reqData, metData] = await Promise.all([
        api.getRequests(),
        api.getMetrics(),
      ]);
      setRequests(reqData.items);
      setMetrics(metData.metrics);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setLastRefresh(new Date());
    }
  };

  useEffect(() => { load(); }, []);

  const todayRequests = requests.filter(
    (r) => new Date(r.requestedAt).toDateString() === new Date().toDateString()
  ).length;

  const summaryCards = [
    {
      label: "Access Requests",
      value: loading ? "…" : String(todayRequests),
      sub: "Today",
      icon: KeyRound,
      badge: "live" as const,
      color: "text-orange-500",
      bg: "bg-orange-50 dark:bg-orange-900/20",
    },
    {
      label: "Lambda Invocations",
      value: loading ? "…" : String(metrics?.lambdaInvocations?.total ?? "—"),
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

  const apiGwData = metrics?.apiGwRequests;

  return (
    <main className="flex-1 p-6 space-y-6 overflow-auto">
      {/* Refresh bar */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-400 dark:text-gray-500">
          {lastRefresh ? `Last updated: ${lastRefresh.toLocaleTimeString()}` : "Loading…"}
        </p>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
        >
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

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
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{label}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* API GW Metric */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
              API Gateway Requests
            </h2>
            <Badge type="live" />
          </div>
          {loading ? (
            <div className="h-40 flex items-center justify-center text-gray-300 dark:text-gray-700 text-sm animate-pulse">
              Loading CloudWatch data…
            </div>
          ) : apiGwData && apiGwData.values.length > 0 ? (
            <div className="space-y-2">
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                {apiGwData.total.toLocaleString()}
              </p>
              <p className="text-xs text-gray-400">Total requests (last 24h)</p>
              <div className="flex items-end gap-0.5 h-20 mt-3">
                {apiGwData.values.slice(-24).map((v, i) => {
                  const max = Math.max(...apiGwData.values, 1);
                  const pct = (v / max) * 100;
                  return (
                    <div
                      key={i}
                      className="flex-1 bg-orange-400 dark:bg-orange-500 rounded-sm opacity-80 hover:opacity-100 transition-opacity"
                      style={{ height: `${Math.max(pct, 2)}%` }}
                      title={`${v} requests`}
                    />
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="h-40 flex items-center justify-center text-gray-400 dark:text-gray-600 text-sm border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg">
              <TrendingUp size={20} className="mr-2" />
              No data yet — call the API to generate metrics
            </div>
          )}
        </div>

        {/* Recent Access Requests */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
              Recent Access Requests
            </h2>
            <Badge type="live" />
          </div>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-10 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
              ))}
            </div>
          ) : requests.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-gray-400 text-sm gap-2">
              <Clock size={20} />
              No requests yet
            </div>
          ) : (
            <ul className="space-y-3">
              {requests.slice(0, 5).map((r) => (
                <li key={r.requestId} className="flex items-start gap-3">
                  <span
                    className={`mt-1 w-2 h-2 rounded-full shrink-0 ${
                      r.status === "Approved"
                        ? "bg-green-500"
                        : r.status === "Rejected"
                        ? "bg-red-500"
                        : "bg-yellow-500"
                    }`}
                  />
                  <div className="min-w-0">
                    <p className="text-sm text-gray-700 dark:text-gray-300 truncate">
                      <span className="font-medium">{r.userId}</span> →{" "}
                      {r.instanceId}
                    </p>
                    <p className="text-xs text-gray-400">
                      {r.permissionLevel} · {r.status} ·{" "}
                      {new Date(r.requestedAt).toLocaleTimeString()}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Legend */}
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
  );
}
