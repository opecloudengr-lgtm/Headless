import React from "react";

const ICONS = {
  Movie: (props) => (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <rect x="2.5" y="5" width="19" height="14" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M7 5v14M17 5v14M2.5 9h4M17.5 9h4M2.5 15h4M17.5 15h4" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  ),
  Music: (props) => (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <path d="M9 18V5l11-2v13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="6" cy="18" r="3" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="17" cy="16" r="3" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  ),
  Ebook: (props) => (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <path
        d="M4 5.5C4 4.7 4.7 4 5.5 4H11v16H5.5A1.5 1.5 0 0 1 4 18.5v-13Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M20 5.5c0-.8-.7-1.5-1.5-1.5H13v16h5.5a1.5 1.5 0 0 0 1.5-1.5v-13Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  ),
};

const GRADIENTS = {
  Movie: "from-wine-700 to-wine-900",
  Music: "from-wine-500 to-wine-800",
  Ebook: "from-gold-600 to-wine-800",
};

export function CategoryGlyph({ category, className = "h-5 w-5" }) {
  const Icon = ICONS[category] || ICONS.Movie;
  return <Icon className={className} />;
}

export function CategoryTile({ category, className = "" }) {
  const gradient = GRADIENTS[category] || GRADIENTS.Movie;
  return (
    <div
      className={`flex items-center justify-center bg-gradient-to-br ${gradient} text-white/90 ${className}`}
    >
      <CategoryGlyph category={category} className="h-10 w-10 opacity-90" />
    </div>
  );
}

export default CategoryGlyph;
