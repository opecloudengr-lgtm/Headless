import React from "react";
import { Link } from "react-router-dom";
import Logo from "./Logo.jsx";

const COLUMNS = [
  {
    title: "Browse",
    links: [
      { label: "Explore all", to: "/explore" },
      { label: "Movies", to: "/explore?category=Movie" },
      { label: "Music", to: "/explore?category=Music" },
      { label: "Ebooks", to: "/explore?category=Ebook" },
    ],
  },
  {
    title: "Account",
    links: [
      { label: "Log in", to: "/login" },
      { label: "Create account", to: "/register" },
      { label: "Upload media", to: "/upload" },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="mt-20 border-t border-wine-100 bg-white">
      <div className="mx-auto max-w-6xl px-4 py-14">
        <div className="flex flex-col gap-10 md:flex-row md:justify-between">
          <div className="max-w-xs">
            <Logo size={34} />
            <p className="mt-3 text-sm text-wine-500">
              A home for creators to share movies, music and ebooks — and for fans to follow, like,
              and discover what's next.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:gap-16">
            {COLUMNS.map((col) => (
              <div key={col.title}>
                <h3 className="mb-3 text-xs font-bold uppercase tracking-[0.15em] text-wine-400">
                  {col.title}
                </h3>
                <ul className="flex flex-col gap-2">
                  {col.links.map((link) => (
                    <li key={link.label}>
                      <Link to={link.to} className="text-sm text-wine-700 hover:text-wine-900 hover:underline">
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-wine-100 pt-6 text-xs text-wine-400 md:flex-row">
          <p>&copy; {new Date().getFullYear()} Headless Media. Crafted for creators.</p>
          <p>Movies &middot; Music &middot; Ebooks</p>
        </div>
      </div>
    </footer>
  );
}
