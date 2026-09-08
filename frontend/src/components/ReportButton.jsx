import React, { useState } from "react";
import { api } from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";

const REASONS = ["Spam", "Inappropriate content", "Harassment", "Copyright", "Other"];

export default function ReportButton({ itemType, itemId, className = "" }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);

  if (!user) return null;

  async function submit(e) {
    e.preventDefault();
    if (!reason.trim()) return;
    setSending(true);
    try {
      await api.reportItem(itemType, itemId, reason.trim());
      setDone(true);
      setTimeout(() => setOpen(false), 1200);
    } catch {
      // silent — reporting is best-effort from the viewer's perspective
    } finally {
      setSending(false);
    }
  }

  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 text-xs font-semibold text-wine-400 hover:text-wine-600"
        title="Report"
      >
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M5 3v18M5 4h11l-2 4 2 4H5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Report
      </button>

      {open && (
        <div className="absolute right-0 z-20 mt-2 w-64 rounded-xl border border-wine-100 bg-white p-3 shadow-wine">
          {done ? (
            <p className="text-sm text-emerald-700">Thanks — we'll take a look.</p>
          ) : (
            <form onSubmit={submit} className="flex flex-col gap-2">
              <p className="text-xs font-semibold text-wine-700">Why are you reporting this?</p>
              <div className="flex flex-wrap gap-1">
                {REASONS.map((r) => (
                  <button
                    type="button"
                    key={r}
                    onClick={() => setReason(r)}
                    className={`rounded-full px-2 py-1 text-[11px] font-semibold ${
                      reason === r ? "bg-wine-700 text-white" : "bg-wine-50 text-wine-700 hover:bg-wine-100"
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
              <button
                type="submit"
                disabled={!reason.trim() || sending}
                className="btn-primary mt-1 w-full py-1.5 text-xs"
              >
                {sending ? "Sending…" : "Submit report"}
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
