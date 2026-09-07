import React from "react";
import { Link } from "react-router-dom";

export function LogoMark({ size = 40 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="drop-shadow-sm"
    >
      <defs>
        <linearGradient id="logo-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#8c2f40" />
          <stop offset="100%" stopColor="#4a1622" />
        </linearGradient>
        <linearGradient id="logo-grad-ring" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#e0bb62" />
          <stop offset="100%" stopColor="#c9a227" />
        </linearGradient>
      </defs>
      <circle cx="32" cy="32" r="31" fill="url(#logo-grad)" stroke="url(#logo-grad-ring)" strokeWidth="1.5" />
      {/* Abstracted "H" formed from a play triangle + soundwave + book spine, in one continuous mark */}
      <path
        d="M20 16 V48 M20 32 H30 M30 16 V48"
        stroke="#f7e9ea"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M37 22 L48 32 L37 42 Z"
        fill="#e0bb62"
      />
    </svg>
  );
}

export default function Logo({ size = 40, withText = true, to = "/" }) {
  return (
    <Link to={to} className="flex items-center gap-3 select-none">
      <LogoMark size={size} />
      {withText && (
        <span className="flex flex-col leading-none">
          <span className="font-display text-xl font-bold tracking-wide text-wine-900">
            Headless
          </span>
          <span className="text-[10px] font-semibold uppercase tracking-[0.25em] text-gold-600">
            Media, Shared
          </span>
        </span>
      )}
    </Link>
  );
}
