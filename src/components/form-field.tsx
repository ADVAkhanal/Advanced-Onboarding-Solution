import type { ReactNode } from "react";

export function FormField({
  label,
  hint,
  error,
  required,
  children
}: {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <label className="form-field">
      <span className="form-label">
        {label}
        {required ? <span aria-hidden="true" className="form-required"> *</span> : null}
      </span>
      {children}
      {hint && !error ? <span className="form-hint">{hint}</span> : null}
      {error ? <span className="form-error" role="alert">{error}</span> : null}
    </label>
  );
}
