import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, ApiError } from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";
import Spinner from "../components/Spinner.jsx";
import Alert from "../components/Alert.jsx";

export default function AdminDashboard() {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);

  function load() {
    setLoading(true);
    api
      .adminUsers()
      .then((res) => setUsers(res.system_accounts))
      .catch(() => setError("Could not load users."))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

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

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold text-wine-950">Admin dashboard</h1>
        <p className="mt-1 text-wine-600">
          Manage user accounts. Visit any{" "}
          <Link to="/explore" className="font-semibold text-wine-700 hover:underline">
            media item
          </Link>{" "}
          to feature or unfeature it.
        </p>
      </div>

      <Alert type="error">{error}</Alert>

      {loading ? (
        <Spinner />
      ) : (
        <div className="card overflow-x-auto">
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
      )}
    </div>
  );
}
