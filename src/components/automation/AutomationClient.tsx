"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import Badge from "@/components/ui/Badge";
import { Zap, RefreshCw, CheckCircle2, Clock } from "lucide-react";

interface LogEvent {
  timestamp: number;
  message: string;
}

const SSM_PATCH_MOCK = [
  { instance: "i-02524a34715bc6930", os: "Amazon Linux 2023", status: "Compliant", installed: 142, missing: 0, time: "2026-05-29 10:00" },
];

const LAMBDA_FUNCTIONS = ["aws-secure-admin-hub"];

export default function AutomationClient() {
  const [selected, setSelected] = useState(LAMBDA_FUNCTIONS[0]);
  const [logs, setLogs] = useState<LogEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [logGroup, setLogGroup] = useState("");

  const load = async (fn: string) => {
    setLoading(true);
    try {
      const data = await api.getLambdaHistory(fn);
      setLogs(data.events);
      setLogGroup(data.logGroupName);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(selected); }, [selected]);

  const parseDuration = (msg: string) => {
    const m = msg.match(/Duration:\s*([\d.]+)\s*ms/);
    return m ? `${parseFloat(m[1]).toFixed(0)} ms` : null;
  };

  const parseMemory = (msg: string) => {
    const m = msg.match(/Max Memory Used:\s*(\d+)\s*MB/);
    return m ? `${m[1]} MB` : null;
  };

  return (
    <main className="flex-1 p-6 space-y-6 overflow-auto">
      {/* Lambda Execution History */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Lambda Execution History</h2>
            <Badge type="live" />
          </div>
          <div className="flex items-center gap-2">
            <select
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
              className="px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-orange-400 outline-none"
            >
              {LAMBDA_FUNCTIONS.map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
            <button
              onClick={() => load(selected)}
              disabled={loading}
              className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="px-4 py-2.5 border-b border-gray-100 dark:border-gray-800 flex items-center gap-2">
            <Zap size={13} className="text-orange-400" />
            <span className="text-xs font-mono text-gray-500 dark:text-gray-400">{logGroup || "—"}</span>
          </div>

          {loading ? (
            <div className="p-8 text-center text-gray-400 text-sm animate-pulse">
              Querying CloudWatch Logs…
            </div>
          ) : logs.length === 0 ? (
            <div className="p-8 flex flex-col items-center gap-2 text-gray-400">
              <Clock size={24} />
              <p className="text-sm">No REPORT log entries yet.</p>
              <p className="text-xs">Invoke the Lambda via API Gateway to generate execution history.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    {["Time", "Duration", "Memory Used", "Raw Report"].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {logs.map((e, i) => (
                    <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                      <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
                        {new Date(e.timestamp).toLocaleTimeString()}
                      </td>
                      <td className="px-4 py-3 text-xs font-mono text-green-600 dark:text-green-400">
                        {parseDuration(e.message) || "—"}
                      </td>
                      <td className="px-4 py-3 text-xs font-mono text-blue-500">
                        {parseMemory(e.message) || "—"}
                      </td>
                      <td className="px-4 py-3 text-xs font-mono text-gray-400 max-w-xs truncate">
                        {e.message}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {/* SSM Patch Management */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Systems Manager — Patch Compliance</h2>
          <Badge type="demo" />
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  {["Instance", "OS", "Compliance", "Installed", "Missing", "Last Scan"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {SSM_PATCH_MOCK.map((r) => (
                  <tr key={r.instance} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-gray-600 dark:text-gray-400">{r.instance}</td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{r.os}</td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-1.5 text-xs font-medium text-green-600 dark:text-green-400">
                        <CheckCircle2 size={13} /> {r.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{r.installed}</td>
                    <td className="px-4 py-3 text-sm text-gray-400">{r.missing}</td>
                    <td className="px-4 py-3 text-xs text-gray-400">{r.time}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <p className="mt-2 text-xs text-gray-400">
          Simulated patch baseline: AmazonLinux2023DefaultPatchBaseline. Real SSM requires SSM Agent + IAM role (already configured on demo instance).
        </p>
      </section>
    </main>
  );
}
