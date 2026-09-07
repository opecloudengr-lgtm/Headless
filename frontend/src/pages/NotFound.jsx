import React from "react";
import { Link } from "react-router-dom";
import { LogoMark } from "../components/Logo.jsx";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
      <LogoMark size={56} />
      <h1 className="font-display text-3xl font-bold text-wine-950">Page not found</h1>
      <p className="text-wine-600">The page you're looking for doesn't exist.</p>
      <Link to="/" className="btn-primary">
        Back to home
      </Link>
    </div>
  );
}
