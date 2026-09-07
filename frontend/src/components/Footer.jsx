import React from "react";
import Logo from "./Logo.jsx";

export default function Footer() {
  return (
    <footer className="mt-20 border-t border-wine-100 bg-white">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 md:flex-row">
        <Logo size={32} />
        <p className="text-sm text-wine-500">
          &copy; {new Date().getFullYear()} Headless Media. Crafted for creators.
        </p>
      </div>
    </footer>
  );
}
