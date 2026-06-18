"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/modal";

type Result = { module: string; moduleLabel: string; id: string; title: string; subtitle?: string; href: string };
type Group = { module: string; moduleLabel: string; results: Result[] };

/**
 * Global Ctrl/Cmd+K command search. Opens on the keyboard shortcut or a
 * `command-palette:open` window event (dispatched by the topbar search box).
 * Queries /api/search (PostgreSQL, permission-aware, no AI) with a debounce
 * and a stale-response guard. Reuses the focus-trapped Modal for a11y.
 */
export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);
  const reqId = useRef(0);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(true);
      }
    }
    function onOpen() {
      setOpen(true);
    }
    window.addEventListener("keydown", onKey);
    window.addEventListener("command-palette:open", onOpen as EventListener);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("command-palette:open", onOpen as EventListener);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const term = q.trim();
    if (term.length < 2) {
      setGroups([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const id = ++reqId.current;
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(term)}`);
        const body = await res.json().catch(() => null);
        if (id !== reqId.current) return; // a newer keystroke superseded this
        setGroups(res.ok && body ? body.groups ?? [] : []);
        setActive(0);
      } finally {
        if (id === reqId.current) setLoading(false);
      }
    }, 180);
    return () => clearTimeout(timer);
  }, [q, open]);

  const flat = groups.flatMap((g) => g.results);

  const close = useCallback(() => {
    setOpen(false);
    setQ("");
    setGroups([]);
    setActive(0);
  }, []);

  const go = useCallback(
    (href: string) => {
      close();
      router.push(href);
    },
    [close, router]
  );

  function onInputKey(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, flat.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const r = flat[active];
      if (r) go(r.href);
    }
  }

  if (!open) return null;

  let idx = -1;
  const term = q.trim();
  return (
    <Modal open={open} title="Search the shop" onClose={close} size="lg">
      <div className="cmdk">
        <input
          className="input cmdk-input"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={onInputKey}
          placeholder="Search jobs, customers, parts, quotes, tickets, POs, shipments…"
          aria-label="Search"
          autoFocus
        />
        <div className="cmdk-results" role="listbox" aria-label="Search results">
          {term.length < 2 ? (
            <div className="empty">Type at least 2 characters. Results are limited to records you can access.</div>
          ) : loading && !flat.length ? (
            <div className="empty">Searching…</div>
          ) : !flat.length ? (
            <div className="empty">No matches for “{term}”.</div>
          ) : (
            groups.map((g) => (
              <div key={g.module} className="cmdk-group">
                <div className="cmdk-group-label">{g.moduleLabel}</div>
                {g.results.map((r) => {
                  idx += 1;
                  const i = idx;
                  return (
                    <button
                      key={`${r.module}:${r.id}`}
                      type="button"
                      role="option"
                      aria-selected={i === active}
                      className={`cmdk-item${i === active ? " active" : ""}`}
                      onMouseEnter={() => setActive(i)}
                      onClick={() => go(r.href)}
                    >
                      <span className="cmdk-title">{r.title}</span>
                      {r.subtitle ? <span className="cmdk-sub">{r.subtitle}</span> : null}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>
      </div>
    </Modal>
  );
}
