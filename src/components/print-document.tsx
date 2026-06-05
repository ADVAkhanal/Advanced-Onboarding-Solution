import type { ReactNode } from "react";
import Link from "next/link";
import { PrintButton } from "@/components/print-button";

/**
 * Reusable customer-facing print/PDF template. Standard chrome (branded
 * header, title + meta block, optional footer disclaimer) wrapped around a
 * document body. Works with the print stylesheet in globals.css — on
 * screen it sits inside the app shell; printed, all chrome is stripped.
 *
 * Server component (no client state); pair with <PrintToolbar/> for the
 * screen-only back + print controls.
 */
export function PrintDocument({
  company,
  kicker,
  title,
  meta,
  footer,
  children
}: {
  company: string;
  kicker: string;
  title: string;
  meta?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
}) {
  return (
    <article className="print-document">
      <header className="print-doc-header">
        <div className="print-doc-brand">
          <strong>{company}</strong>
          <span>{kicker}</span>
        </div>
        <div className="print-doc-meta">
          <div className="doc-title">{title}</div>
          {meta}
        </div>
      </header>

      {children}

      {footer ? <footer className="print-doc-footer">{footer}</footer> : null}
    </article>
  );
}

/** Screen-only toolbar: a back link + the print/save-as-PDF button. */
export function PrintToolbar({ backHref, backLabel = "← Back" }: { backHref: string; backLabel?: string }) {
  return (
    <div className="print-toolbar no-print">
      <Link className="button" href={backHref}>
        {backLabel}
      </Link>
      <PrintButton />
    </div>
  );
}
