"use client";

export function PrintButton() {
  return (
    <button type="button" className="button primary no-print" onClick={() => window.print()}>
      Print / Save as PDF
    </button>
  );
}
