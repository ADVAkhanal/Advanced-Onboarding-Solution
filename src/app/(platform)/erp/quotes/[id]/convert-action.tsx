"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ConvertAction({ quoteId }: { quoteId: string }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [orderNumber, setOrderNumber] = useState<string | null>(null);

  async function convert() {
    setSaving(true);
    setError("");

    const customerPoNumber = window.prompt(
      "Customer PO number for this sales order? (Optional — leave blank to add later)"
    );
    // A null return means the user cancelled the prompt — abort the convert.
    if (customerPoNumber === null) {
      setSaving(false);
      return;
    }

    const response = await fetch(`/api/erp/quotes/${quoteId}/convert`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        customerPoNumber: customerPoNumber.trim() || undefined
      })
    });

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      setError(body?.error?.message ?? "Unable to convert quote.");
      setSaving(false);
      return;
    }

    const body = await response.json().catch(() => null);
    setOrderNumber(body?.data?.order?.orderNumber ?? "the new order");
    setSaving(false);
    router.refresh();
  }

  if (orderNumber) {
    return (
      <div className="pill green" role="status">
        Converted to sales order {orderNumber}.
      </div>
    );
  }

  return (
    <div>
      <button type="button" className="button primary" onClick={convert} disabled={saving}>
        {saving ? "Converting…" : "Convert to sales order"}
      </button>
      {error ? (
        <div className="pill red" role="alert" style={{ marginTop: 8 }}>
          {error}
        </div>
      ) : null}
    </div>
  );
}
