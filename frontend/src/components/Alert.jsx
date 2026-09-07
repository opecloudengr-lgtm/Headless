import React from "react";

export default function Alert({ type = "error", children }) {
  if (!children) return null;

  const styles = {
    error: "bg-red-50 text-red-700 border-red-200",
    success: "bg-emerald-50 text-emerald-700 border-emerald-200",
    info: "bg-wine-50 text-wine-800 border-wine-200",
  };

  return (
    <div className={`rounded-xl border px-4 py-3 text-sm font-medium ${styles[type]}`}>
      {children}
    </div>
  );
}
