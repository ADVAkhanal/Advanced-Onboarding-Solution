"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/** Quick +/- on-hand adjustment for one MRO part. */
export function PartAdjustForm({ id }: { id: string }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  async function adjust(delta: number) {
    setSaving(true);
    const response = await fetch(`/api/maintenance/parts/${id}/adjust`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ delta })
    });
    setSaving(false);
    if (response.ok) router.refresh();
  }

  return (
    <div style={{ display: "inline-flex", gap: 4 }}>
      <button className="button" type="button" onClick={() => adjust(-1)} disabled={saving} aria-label="Decrease on-hand by 1">−1</button>
      <button className="button" type="button" onClick={() => adjust(1)} disabled={saving} aria-label="Increase on-hand by 1">+1</button>
      <button className="button" type="button" onClick={() => adjust(10)} disabled={saving} aria-label="Increase on-hand by 10">+10</button>
    </div>
  );
}
