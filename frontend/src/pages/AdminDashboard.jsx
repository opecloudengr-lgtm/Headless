import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, ApiError } from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";
import Spinner from "../components/Spinner.jsx";
import Alert from "../components/Alert.jsx";

function UsersTable() {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);

  useEffect(() => {
    api
      .adminUsers()
      .then((res) => setUsers(res.system_accounts))
      .catch(() => setError("Could not load users."))
      .finally(() => setLoading(false));
  }, []);

  async function toggleStatus(account) {
    const nextStatus = account.status === "active" ? "suspended" : "active";
    setBusyId(account.user_id);
    setError("");
    try {
      await api.adminSetUserStatus(account.user_id, nextStatus);
      setUsers((list) =>
        list.map((u) => (u.user_id === account.user_id ? { ...u, status: nextStatus } : u))
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not update user status.");
    } finally {
      setBusyId(null);
    }
  }

  if (loading) return <Spinner />;

  return (
    <>
      <Alert type="error">{error}</Alert>
      <div className="card mt-4 overflow-x-auto">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead className="bg-wine-50 text-wine-700">
            <tr>
              <th className="px-4 py-3 font-semibold">User</th>
              <th className="px-4 py-3 font-semibold">Email</th>
              <th className="px-4 py-3 font-semibold">Uploads</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-wine-100">
            {users.map((account) => (
              <tr key={account.user_id}>
                <td className="px-4 py-3 font-semibold text-wine-900">
                  <Link to={`/profile/${account.user_id}`} className="hover:underline">
                    {account.username}
                  </Link>
                  {account.is_admin && (
                    <span className="badge ml-2 bg-gold-500 text-wine-950">Admin</span>
                  )}
                </td>
                <td className="px-4 py-3 text-wine-600">{account.email}</td>
                <td className="px-4 py-3 text-wine-600">{account.total_uploads}</td>
                <td className="px-4 py-3">
                  <span
                    className={`badge ${
                      account.status === "active"
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {account.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {account.user_id === user.id ? (
                    <span className="text-xs text-wine-400">You</span>
                  ) : (
                    <button
                      onClick={() => toggleStatus(account)}
                      disabled={busyId === account.user_id}
                      className={account.status === "active" ? "btn-outline" : "btn-primary"}
                    >
                      {account.status === "active" ? "Suspend" : "Activate"}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function ReportsQueue() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [statusFilter, setStatusFilter] = useState("pending");

  function load(status) {
    setLoading(true);
    api
      .adminReports(status)
      .then((res) => setReports(res.reports))
      .catch(() => setError("Could not load reports."))
      .finally(() => setLoading(false));
  }

  useEffect(() => load(statusFilter), [statusFilter]);

  async function resolve(reportId, action) {
    setBusyId(reportId);
    setError("");
    try {
      await api.adminResolveReport(reportId, action);
      setReports((list) => list.filter((r) => r.id !== reportId));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not resolve report.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <div className="mt-4 flex gap-2">
        {["pending", "dismissed", "actioned", "all"].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`btn ${statusFilter === s ? "bg-wine-700 text-white" : "btn-outline"} py-1.5 text-xs`}
          >
            {s}
          </button>
        ))}
      </div>

      <Alert type="error">{error}</Alert>

      {loading ? (
        <Spinner />
      ) : reports.length === 0 ? (
        <p className="mt-6 text-wine-500">No {statusFilter !== "all" ? statusFilter : ""} reports.</p>
      ) : (
        <div className="mt-4 flex flex-col gap-3">
          {reports.map((r) => (
            <div key={r.id} className="card flex flex-col gap-2 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="badge bg-wine-100 text-wine-700">{r.item_type} #{r.item_id}</span>
                <span className="text-xs text-wine-400">
                  reported by <span className="font-semibold">{r.reporter.username}</span> &middot;{" "}
                  {new Date(r.created_at).toLocaleString()}
                </span>
              </div>
              <p className="text-sm text-wine-800">{r.reason}</p>
              {r.status === "pending" && (
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => resolve(r.id, "dismiss")}
                    disabled={busyId === r.id}
                    className="btn-outline py-1.5 text-xs"
                  >
                    Dismiss
                  </button>
                  <button
                    onClick={() => resolve(r.id, "hide")}
                    disabled={busyId === r.id}
                    className="btn bg-red-600 py-1.5 text-xs text-white hover:bg-red-700"
                  >
                    Remove content
                  </button>
                </div>
              )}
              {r.status !== "pending" && (
                <span className="badge w-fit bg-wine-50 text-wine-500">{r.status}</span>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
}

export default function AdminDashboard() {
  const [tab, setTab] = useState("users");

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="mb-6">
        <h1 className="font-display text-3xl font-bold text-wine-950">Admin dashboard</h1>
        <p className="mt-1 text-wine-600">
          Manage user accounts and review reported content. Visit any{" "}
          <Link to="/explore" className="font-semibold text-wine-700 hover:underline">
            media item
          </Link>{" "}
          to feature or unfeature it.
        </p>
      </div>

      <div className="flex gap-1 rounded-full bg-wine-50 p-1 w-fit">
        {[
          { key: "users", label: "Users" },
          { key: "reports", label: "Reports" },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
              tab === t.key ? "bg-white text-wine-900 shadow-sm" : "text-wine-500 hover:text-wine-800"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "users" ? <UsersTable /> : <ReportsQueue />}
    </div>
  );
}
