/**
 * Minimal, dependency-free CSV serialization shared by every dashboard
 * export. RFC-4180-ish: fields containing a comma, quote, CR or LF are
 * wrapped in double quotes with embedded quotes doubled.
 */
export function csvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  const str = typeof value === "string" ? value : String(value);
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export type CsvColumn = { key: string; label: string };

/**
 * Build a CSV string from column definitions and row records.
 * Header uses column labels; cells are pulled by column key.
 */
export function toCsv(columns: CsvColumn[], rows: Array<Record<string, unknown>>): string {
  const header = columns.map((c) => csvCell(c.label)).join(",");
  const body = rows.map((row) => columns.map((c) => csvCell(row[c.key])).join(",")).join("\n");
  return body ? `${header}\n${body}` : header;
}
