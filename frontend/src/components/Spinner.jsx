import React from "react";

export default function Spinner({ className = "" }) {
  return (
    <div className={`flex items-center justify-center py-10 ${className}`}>
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-wine-200 border-t-wine-700" />
    </div>
  );
}
