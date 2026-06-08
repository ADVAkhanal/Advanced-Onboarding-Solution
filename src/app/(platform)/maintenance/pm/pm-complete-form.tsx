"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/** One-click PM check-off. Logs a completion and rolls the next due date. */
export function PmCompleteButton({ id }: { id: string }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  async function complete() {
    setSaving(true);
    const response = await fetch(`/api/maintenance/pm/${id}/complete`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({})
    });
    setSaving(false);
    if (response.ok) router.refresh();
  }

  return (
    <button className="button" type="button" onClick={complete} disabled={saving} title="Log completion and roll next due date">
      {saving ? "…" : "✓ Done"}
    </button>
  );
}
