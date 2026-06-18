"use client";

import { Search } from "lucide-react";

/** Topbar search box — opens the global command palette (Ctrl/Cmd+K). */
export function TopbarSearch() {
  return (
    <button
      type="button"
      className="search search-trigger"
      onClick={() => window.dispatchEvent(new Event("command-palette:open"))}
      aria-label="Search the shop (Ctrl+K)"
    >
      <Search size={18} />
      <span className="search-placeholder">Search jobs, customers, parts, tickets…</span>
      <kbd className="search-kbd">Ctrl K</kbd>
    </button>
  );
}
