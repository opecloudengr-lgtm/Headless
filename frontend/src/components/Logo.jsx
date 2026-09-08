import React from "react";
import { Link } from "react-router-dom";

export function LogoMark({ size = 40 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="drop-shadow-sm"
    >
      <defs>
        <linearGradient id="logo-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#8c2f40" />
          <stop offset="100%" stopColor="#4a1622" />
        </linearGradient>
      </defs>

      <rect x="2" y="2" width="96" height="96" rx="24" fill="url(#logo-grad)" />

      {/* "H" formed from two bars joined by a twisted ribbon, with a
          play-triangle cut out of the twist — movie/music/ebook motif. */}
      <rect x="21" y="21" width="15" height="58" rx="7.5" fill="#fdf4f5" />
      <rect x="64" y="21" width="15" height="58" rx="7.5" fill="#fdf4f5" />
      <path
        d="M36 41 C 50 41 50 59 64 59 L64 41 C 50 41 50 59 36 59 Z"
        fill="#fdf4f5"
      />
      <path d="M43.5 43.5 L43.5 56.5 L58 50 Z" fill="#5c1f2a" />
    </svg>
  );
}

export default function Logo({ size = 40, withText = true, to = "/" }) {
  return (
    <Link to={to} className="flex items-center gap-3 select-none">
      <LogoMark size={size} />
      {withText && (
        <span className="flex flex-col leading-none">
          <span className="font-logo text-2xl font-extrabold tracking-tight text-wine-900">
            Headless
          </span>
          <span className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.2em] text-gold-600">
            <span className="h-px w-3 bg-gold-500/60" />
            Media and Share
            <span className="h-px w-3 bg-gold-500/60" />
          </span>
        </span>
      )}
    </Link>
  );
}
