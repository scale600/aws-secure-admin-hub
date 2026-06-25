"use client";

import { useEffect, useState } from "react";
import { api, type AccessRequest, type CreateRequestInput } from "@/lib/api";
import Badge from "@/components/ui/Badge";
import { KeyRound, Plus, X, CheckCircle, XCircle, Clock, RefreshCw } from "lucide-react";

const EC2_INSTANCE_ID = process.env.NEXT_PUBLIC_EC2_INSTANCE_ID || "";

const PERMISSION_LEVELS = ["ReadOnly", "PowerUser", "Admin"] as const;

const STATUS_STYLES: Record<string, string> = {
  Pending: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  Approved: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  Rejected: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

export default function AccessClient() {
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [policyModal, setPolicyModal] = useState<{ requestId: string; policy: string } | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const [form, setForm] = useState<CreateRequestInput>({
    userId: "guest",
    instanceId: EC2_INSTANCE_ID,
    purpose: "",
    duration: 2,
    permissionLevel: "ReadOnly",
  });

  const load = async () => {
    setLoading(true);
    try {
      const data = await api.getRequests();
      setRequests(data.items);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.createRequest(form);
      setShowForm(false);
      setForm({ userId: "guest", instanceId: EC2_INSTANCE_ID, purpose: "", duration: 2, permissionLevel: "ReadOnly" });
      await load();
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAction = async (requestId: string, status: "Approved" | "Rejected") => {
    setActionLoading(requestId + status);
    try {
      const res = await api.updateRequestStatus(requestId, status);
      if (status === "Approved" && res.generatedPolicy) {
        setPolicyModal({ requestId, policy: res.generatedPolicy });
      }
      await load();
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <main className="flex-1 p-6 space-y-6 overflow-auto">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            Access Requests
          </h2>
          <Badge type="live" />
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={load}
            disabled={loading}
            className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
          </button>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors"
          >
            <Plus size={15} />
            New Request
          </button>
        </div>
      </div>

      {/* Request Form */}
      {showForm && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-orange-200 dark:border-orange-800 p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <KeyRound size={16} className="text-orange-500" />
              <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                New Access Request
              </h3>
            </div>
            <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
              <X size={16} />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                Instance ID
              </label>
              <input
                type="text"
                value={form.instanceId}
                onChange={(e) => setForm({ ...form, instanceId: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-400 focus:border-transparent outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                Permission Level
              </label>
              <select
                value={form.permissionLevel}
                onChange={(e) => setForm({ ...form, permissionLevel: e.target.value as typeof form.permissionLevel })}
                className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-400 outline-none"
              >
                {PERMISSION_LEVELS.map((l) => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                Duration (hours)
              </label>
              <input
                type="number"
                min={1}
                max={72}
                value={form.duration}
                onChange={(e) => setForm({ ...form, duration: Number(e.target.value) })}
                className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-400 outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                Purpose
              </label>
              <input
                type="text"
                value={form.purpose}
                onChange={(e) => setForm({ ...form, purpose: e.target.value })}
                placeholder="e.g. Patch deployment"
                className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-400 outline-none"
                required
              />
            </div>
            <div className="sm:col-span-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 text-sm bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white rounded-lg transition-colors"
              >
                {submitting ? "Submitting…" : "Submit Request"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Requests Table */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400 text-sm animate-pulse">Loading requests…</div>
        ) : requests.length === 0 ? (
          <div className="p-12 flex flex-col items-center gap-3 text-gray-400">
            <Clock size={28} />
            <p className="text-sm">No access requests yet. Click &quot;New Request&quot; to create one.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  {["User", "Instance", "Permission", "Duration", "Purpose", "Status", "Requested", "Actions"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {requests.map((r) => (
                  <tr key={r.requestId} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-200">{r.userId}</td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-600 dark:text-gray-400">{r.instanceId}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        r.permissionLevel === "Admin"
                          ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                          : r.permissionLevel === "PowerUser"
                          ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
                          : "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
                      }`}>
                        {r.permissionLevel}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{r.duration}h</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400 max-w-[160px] truncate">{r.purpose}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[r.status]}`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400">
                      {new Date(r.requestedAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      {r.status === "Pending" ? (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleAction(r.requestId, "Approved")}
                            disabled={actionLoading === r.requestId + "Approved"}
                            className="p-1 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded transition-colors disabled:opacity-40"
                            title="Approve"
                          >
                            <CheckCircle size={16} />
                          </button>
                          <button
                            onClick={() => handleAction(r.requestId, "Rejected")}
                            disabled={actionLoading === r.requestId + "Rejected"}
                            className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors disabled:opacity-40"
                            title="Reject"
                          >
                            <XCircle size={16} />
                          </button>
                        </div>
                      ) : r.status === "Approved" && r.generatedPolicy ? (
                        <button
                          onClick={() => setPolicyModal({ requestId: r.requestId, policy: r.generatedPolicy! })}
                          className="text-xs text-orange-500 hover:underline"
                        >
                          View Policy
                        </button>
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

      {/* Session Manager info box */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
        <p className="text-xs font-semibold text-blue-700 dark:text-blue-400 mb-1">
          Why Session Manager instead of SSH?
        </p>
        <p className="text-xs text-blue-600 dark:text-blue-300">
          No inbound port (22) required · Full audit trail via CloudTrail ·
          IAM-controlled access · Works without a key pair
        </p>
      </div>

      {/* IAM Policy Modal */}
      {policyModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 w-full max-w-2xl shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                  Generated IAM Policy — Least Privilege
                </h3>
                <Badge type="live" />
              </div>
              <button
                onClick={() => setPolicyModal(null)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <X size={18} />
              </button>
            </div>
            <pre className="p-5 text-xs font-mono text-green-400 bg-gray-950 rounded-b-xl overflow-auto max-h-96">
              {policyModal.policy}
            </pre>
          </div>
        </div>
      )}
    </main>
  );
}
