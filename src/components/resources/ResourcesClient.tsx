"use client";

import { useEffect, useState, useCallback } from "react";
import { api, type EC2Instance, type S3Bucket, type CloudWatchMetrics } from "@/lib/api";
import Badge from "@/components/ui/Badge";
import { Server, Play, Square, RefreshCw, Shield, ShieldOff, TrendingUp } from "lucide-react";

const EC2_INSTANCE_ID = process.env.NEXT_PUBLIC_EC2_INSTANCE_ID || "i-02524a34715bc6930";

const STATE_STYLES: Record<string, string> = {
  running: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  stopped: "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400",
  pending: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  stopping: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
};

export default function ResourcesClient() {
  const [instances, setInstances] = useState<EC2Instance[]>([]);
  const [buckets, setBuckets] = useState<S3Bucket[]>([]);
  const [metrics, setMetrics] = useState<CloudWatchMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [ec2Action, setEc2Action] = useState<string | null>(null);
  const [polling, setPolling] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [instData, bucketData, metData] = await Promise.all([
        api.getInstances(),
        api.getBuckets(),
        api.getMetrics(),
      ]);
      setInstances(instData.instances);
      setBuckets(bucketData.buckets);
      setMetrics(metData.metrics);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Poll EC2 state until running/stopped
  const pollInstance = useCallback(async (id: string, target: "running" | "stopped") => {
    setPolling(true);
    let attempts = 0;
    while (attempts < 20) {
      await new Promise((r) => setTimeout(r, 5000));
      try {
        const data = await api.getInstances();
        const inst = data.instances.find((i) => i.instanceId === id);
        setInstances(data.instances);
        if (inst?.state === target) break;
      } catch {}
      attempts++;
    }
    setPolling(false);
    setEc2Action(null);
  }, []);

  const handleStart = async (instanceId: string) => {
    setEc2Action(instanceId);
    try {
      await api.startInstance(instanceId);
      pollInstance(instanceId, "running");
    } catch (e) {
      console.error(e);
      setEc2Action(null);
    }
  };

  const handleStop = async (instanceId: string) => {
    setEc2Action(instanceId);
    try {
      await api.stopInstance(instanceId);
      pollInstance(instanceId, "stopped");
    } catch (e) {
      console.error(e);
      setEc2Action(null);
    }
  };

  const apiGw = metrics?.apiGwRequests;
  const lambda = metrics?.lambdaInvocations;

  return (
    <main className="flex-1 p-6 space-y-6 overflow-auto">
      {/* EC2 Instances */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">EC2 Instances</h2>
            <Badge type="live" />
            {polling && (
              <span className="text-xs text-orange-500 animate-pulse flex items-center gap-1">
                <RefreshCw size={11} className="animate-spin" /> Polling state…
              </span>
            )}
          </div>
          <button onClick={load} disabled={loading} className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-400 text-sm animate-pulse">Loading instances…</div>
          ) : instances.length === 0 ? (
            <div className="p-8 flex flex-col items-center gap-2 text-gray-400">
              <Server size={24} />
              <p className="text-sm">No instances found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    {["Name", "Instance ID", "Type", "State", "Private IP", "Actions"].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {instances.map((i) => (
                    <tr key={i.instanceId} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                      <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-200">{i.name || "—"}</td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-500 dark:text-gray-400">{i.instanceId}</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{i.type}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${STATE_STYLES[i.state] || STATE_STYLES.stopped}`}>
                          {["pending", "stopping"].includes(i.state) && (
                            <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                          )}
                          {i.state}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-500 dark:text-gray-400">{i.privateIp || "—"}</td>
                      <td className="px-4 py-3">
                        {i.instanceId === EC2_INSTANCE_ID ? (
                          <div className="flex items-center gap-1">
                            {i.state === "stopped" ? (
                              <button
                                onClick={() => handleStart(i.instanceId)}
                                disabled={ec2Action === i.instanceId}
                                className="flex items-center gap-1 px-2.5 py-1 text-xs bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white rounded-md transition-colors"
                              >
                                <Play size={11} />
                                {ec2Action === i.instanceId ? "Starting…" : "Start"}
                              </button>
                            ) : i.state === "running" ? (
                              <button
                                onClick={() => handleStop(i.instanceId)}
                                disabled={ec2Action === i.instanceId}
                                className="flex items-center gap-1 px-2.5 py-1 text-xs bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white rounded-md transition-colors"
                              >
                                <Square size={11} />
                                {ec2Action === i.instanceId ? "Stopping…" : "Stop"}
                              </button>
                            ) : (
                              <span className="text-xs text-gray-400 animate-pulse">Transitioning…</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-300 dark:text-gray-600">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <p className="mt-2 text-xs text-gray-400">
          Demo instance: Start/Stop calls real <code className="font-mono">ec2.startInstances()</code> SDK — no inbound ports, Session Manager only.
        </p>
      </section>

      {/* S3 Buckets */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">S3 Buckets</h2>
          <Badge type="live" />
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          {loading ? (
            <div className="p-6 text-center text-gray-400 text-sm animate-pulse">Loading buckets…</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    {["Bucket Name", "Public Access", "Bucket Policy", "Created"].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {buckets.map((b) => (
                    <tr key={b.name} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-gray-700 dark:text-gray-300">{b.name}</td>
                      <td className="px-4 py-3">
                        {b.publicAccessBlocked ? (
                          <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                            <Shield size={13} /> Blocked
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-xs text-red-500">
                            <ShieldOff size={13} /> Public
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          b.policyExists
                            ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                            : "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400"
                        }`}>
                          {b.policyExists ? "Has Policy" : "No Policy"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400">
                        {new Date(b.creationDate).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {/* CloudWatch Metrics */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">CloudWatch Metrics</h2>
          <Badge type="live" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[
            { label: "Lambda Invocations", data: lambda, color: "bg-green-400 dark:bg-green-500" },
            { label: "API Gateway Requests", data: apiGw, color: "bg-orange-400 dark:bg-orange-500" },
          ].map(({ label, data, color }) => (
            <div key={label} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</p>
                <TrendingUp size={15} className="text-gray-400" />
              </div>
              {loading || !data ? (
                <div className="h-20 bg-gray-50 dark:bg-gray-800 rounded animate-pulse" />
              ) : (
                <>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                    {data.total.toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-400 mb-3">Total — last 24h</p>
                  <div className="flex items-end gap-0.5 h-16">
                    {data.values.slice(-24).map((v, i) => {
                      const max = Math.max(...data.values, 1);
                      return (
                        <div
                          key={i}
                          className={`flex-1 ${color} rounded-sm opacity-80`}
                          style={{ height: `${Math.max((v / max) * 100, 2)}%` }}
                          title={`${v}`}
                        />
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* VPC - DEMO */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">VPC Overview</h2>
          <Badge type="demo" />
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <div className="grid grid-cols-3 gap-4 text-center text-sm">
            {[
              { label: "VPCs", value: "1" },
              { label: "Subnets", value: "6" },
              { label: "Security Groups", value: "3" },
            ].map(({ label, value }) => (
              <div key={label} className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
                <p className="text-2xl font-bold text-gray-800 dark:text-gray-200">{value}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
