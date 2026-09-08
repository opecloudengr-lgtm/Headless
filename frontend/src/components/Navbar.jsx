import React, { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import Logo from "./Logo.jsx";
import { useAuth } from "../context/AuthContext.jsx";

function NavItem({ to, children }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `rounded-full px-4 py-2 text-sm font-semibold transition ${
          isActive ? "bg-wine-100 text-wine-900" : "text-wine-600 hover:bg-wine-50 hover:text-wine-900"
        }`
      }
    >
      {children}
    </NavLink>
  );
}

export default function Navbar() {
  const { user, loading, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  async function handleLogout() {
    await logout();
    setOpen(false);
    navigate("/");
  }

  return (
    <header className="sticky top-0 z-40 border-b border-wine-100 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Logo size={38} />

        <nav className="hidden items-center gap-1 md:flex">
          <NavItem to="/explore">Explore</NavItem>
          <NavItem to="/timeline">Timeline</NavItem>
          {user && <NavItem to="/dashboard">Dashboard</NavItem>}
          {user?.is_admin && <NavItem to="/admin">Admin</NavItem>}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          {loading ? (
            <div className="h-9 w-40" />
          ) : user ? (
            <>
              <Link to="/upload" className="btn-outline">
                Upload
              </Link>
              <Link to="/profile" className="btn-ghost">
                {user.username}
              </Link>
              <button onClick={handleLogout} className="btn-primary">
                Log out
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn-ghost">
                Log in
              </Link>
              <Link to="/register" className="btn-primary">
                Join Headless
              </Link>
            </>
          )}
        </div>

        <button
          className="flex h-10 w-10 items-center justify-center rounded-full text-wine-800 md:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
            {open ? <path d="M6 6l12 12M18 6l-12 12" /> : <path d="M3 6h18M3 12h18M3 18h18" />}
          </svg>
        </button>
      </div>

      {open && (
        <div className="border-t border-wine-100 bg-white px-4 pb-4 md:hidden">
          <div className="flex flex-col gap-1 pt-2">
            <NavItem to="/explore">Explore</NavItem>
            <NavItem to="/timeline">Timeline</NavItem>
            {user && <NavItem to="/dashboard">Dashboard</NavItem>}
            {user?.is_admin && <NavItem to="/admin">Admin</NavItem>}
          </div>
          <div className="mt-3 flex flex-col gap-2">
            {loading ? null : user ? (
              <>
                <Link to="/upload" className="btn-outline w-full" onClick={() => setOpen(false)}>
                  Upload
                </Link>
                <Link to="/profile" className="btn-ghost w-full" onClick={() => setOpen(false)}>
                  {user.username}
                </Link>
                <button onClick={handleLogout} className="btn-primary w-full">
                  Log out
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="btn-ghost w-full" onClick={() => setOpen(false)}>
                  Log in
                </Link>
                <Link to="/register" className="btn-primary w-full" onClick={() => setOpen(false)}>
                  Join Headless
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
