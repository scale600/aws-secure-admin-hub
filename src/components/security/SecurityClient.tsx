"use client";

import { useEffect, useState } from "react";
import { api, type GeneratePolicyInput } from "@/lib/api";
import Badge from "@/components/ui/Badge";
import { RefreshCw, Plus, Minus, AlertTriangle, CheckCircle2 } from "lucide-react";

interface CloudTrailEvent {
  eventId?: string;
  eventName?: string;
  eventSource?: string;
  sourceIPAddress?: string;
  eventTime?: string;
  userName?: string;
  [key: string]: unknown;
}

const GUARD_DUTY_MOCK = [
  { id: "gd-001", severity: "High", type: "UnauthorizedAccess:IAMUser/MaliciousIPCaller", resource: "IAMUser/temp-user", time: "10m ago" },
  { id: "gd-002", severity: "Medium", type: "Recon:EC2/PortProbeUnprotectedPort", resource: "i-02524a34715bc6930", time: "1h ago" },
  { id: "gd-003", severity: "Low", type: "Policy:S3/BucketBlockPublicAccessDisabled", resource: "my-bucket", time: "3h ago" },
];

const SEVERITY_STYLES: Record<string, string> = {
  High: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  Medium: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  Low: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
};

const BEST_PRACTICES = [
  { label: "Root account MFA enabled", status: true },
  { label: "CloudTrail logging active", status: true },
  { label: "S3 public access blocked (CloudTrail bucket)", status: true },
  { label: "EC2 Security Group — no 0.0.0.0/0 inbound SSH", status: true },
  { label: "IAM password policy configured", status: false },
  { label: "GuardDuty enabled", status: false },
];

export default function SecurityClient() {
  const [events, setEvents] = useState<CloudTrailEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [policyInput, setPolicyInput] = useState<GeneratePolicyInput>({
    instanceId: "i-02524a34715bc6930",
    permissionLevel: "ReadOnly",
    actions: ["ec2:DescribeInstances"],
    resource: "*",
  });
  const [generatedPolicy, setGeneratedPolicy] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [severityFilter, setSeverityFilter] = useState<string>("All");

  useEffect(() => {
    (async () => {
      try {
        const data = await api.getCloudTrailEvents();
        setEvents(data.events);
      } catch {}
      setEventsLoading(false);
    })();
  }, []);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setGenerating(true);
    try {
      const res = await api.generatePolicy(policyInput);
      setGeneratedPolicy(res.policy);
    } catch (e) {
      console.error(e);
    } finally {
      setGenerating(false);
    }
  };

  const addAction = () =>
    setPolicyInput((p) => ({ ...p, actions: [...(p.actions || []), ""] }));
  const removeAction = (i: number) =>
    setPolicyInput((p) => ({ ...p, actions: p.actions?.filter((_, idx) => idx !== i) }));
  const updateAction = (i: number, val: string) =>
    setPolicyInput((p) => ({
      ...p,
      actions: p.actions?.map((a, idx) => (idx === i ? val : a)),
    }));

  const filteredFindings =
    severityFilter === "All"
      ? GUARD_DUTY_MOCK
      : GUARD_DUTY_MOCK.filter((g) => g.severity === severityFilter);

  return (
    <main className="flex-1 p-6 space-y-6 overflow-auto">
      {/* CloudTrail Events */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">CloudTrail Event Log</h2>
          <Badge type="live" />
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          {eventsLoading ? (
            <div className="p-6 text-center text-gray-400 text-sm animate-pulse">Loading events…</div>
          ) : events.length === 0 ? (
            <div className="p-6 text-center text-gray-400 text-sm space-y-1">
              <p>CloudTrail logs are being collected → S3 bucket.</p>
              <p className="text-xs">Events will appear here once the Lambda S3-trigger is configured (Phase 2 remaining item).</p>
              <p className="text-xs font-mono text-orange-400">Trail: aws-secure-admin-hub-trail → aws-secure-admin-hub-cloudtrail-753523452116</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    {["Event", "Source", "User", "Source IP", "Time"].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {events.map((e, i) => (
                    <tr key={e.eventId || i} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="px-4 py-3 font-mono text-xs text-orange-500">{String(e.eventName || "—")}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">{String(e.eventSource || "—")}</td>
                      <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-400">{String(e.userName || "—")}</td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-400">{String(e.sourceIPAddress || "—")}</td>
                      <td className="px-4 py-3 text-xs text-gray-400">{e.eventTime ? new Date(String(e.eventTime)).toLocaleString() : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {/* IAM Policy Generator */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">IAM Policy Generator</h2>
          <Badge type="live" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
            <form onSubmit={handleGenerate} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Instance ID (optional)</label>
                <input
                  type="text"
                  value={policyInput.instanceId || ""}
                  onChange={(e) => setPolicyInput((p) => ({ ...p, instanceId: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-400 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Resource ARN / *</label>
                <input
                  type="text"
                  value={policyInput.resource || ""}
                  onChange={(e) => setPolicyInput((p) => ({ ...p, resource: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-400 outline-none"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Actions</label>
                  <button type="button" onClick={addAction} className="text-orange-500 hover:text-orange-600">
                    <Plus size={14} />
                  </button>
                </div>
                <div className="space-y-1.5">
                  {(policyInput.actions || []).map((a, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={a}
                        onChange={(e) => updateAction(i, e.target.value)}
                        placeholder="e.g. ec2:DescribeInstances"
                        className="flex-1 px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-400 outline-none font-mono"
                      />
                      <button type="button" onClick={() => removeAction(i)} className="text-gray-400 hover:text-red-500">
                        <Minus size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
              <button
                type="submit"
                disabled={generating}
                className="w-full py-2 text-sm bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white rounded-lg transition-colors"
              >
                {generating ? "Generating…" : "Generate Least Privilege Policy"}
              </button>
            </form>
          </div>

          <div className="bg-gray-950 rounded-xl border border-gray-700 p-5 min-h-[200px]">
            {generatedPolicy ? (
              <pre className="text-xs font-mono text-green-400 whitespace-pre-wrap break-all overflow-auto max-h-80">
                {generatedPolicy}
              </pre>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-600 text-sm">
                Policy JSON will appear here
              </div>
            )}
          </div>
        </div>
      </section>

      {/* GuardDuty Findings */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">GuardDuty Findings</h2>
            <Badge type="demo" />
          </div>
          <div className="flex items-center gap-1">
            {["All", "High", "Medium", "Low"].map((s) => (
              <button
                key={s}
                onClick={() => setSeverityFilter(s)}
                className={`px-2.5 py-1 text-xs rounded-md transition-colors ${
                  severityFilter === s
                    ? "bg-orange-500 text-white"
                    : "text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-2">
          {filteredFindings.map((g) => (
            <div key={g.id} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 flex items-start gap-3">
              <AlertTriangle size={16} className={`mt-0.5 shrink-0 ${g.severity === "High" ? "text-red-500" : g.severity === "Medium" ? "text-orange-500" : "text-yellow-500"}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className={`px-1.5 py-0.5 text-xs font-medium rounded ${SEVERITY_STYLES[g.severity]}`}>{g.severity}</span>
                  <p className="text-sm font-mono text-gray-700 dark:text-gray-300 truncate">{g.type}</p>
                </div>
                <p className="text-xs text-gray-400">{g.resource} · {g.time}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Security Best Practices */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Security Best Practices</h2>
          <Badge type="demo" />
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-800">
          {BEST_PRACTICES.map(({ label, status }) => (
            <div key={label} className="flex items-center gap-3 px-5 py-3">
              <CheckCircle2 size={16} className={status ? "text-green-500" : "text-gray-300 dark:text-gray-600"} />
              <span className={`text-sm ${status ? "text-gray-700 dark:text-gray-300" : "text-gray-400 dark:text-gray-500"}`}>
                {label}
              </span>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
