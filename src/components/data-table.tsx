import type { ReactNode } from "react";

export type Column<Row> = {
  key: string;
  header: string;
  align?: "left" | "center" | "right";
  width?: string;
  /** Set true for currency, counts, durations — applies tabular-nums + right-align hint. */
  numeric?: boolean;
  /** Hide the header text visually but keep it for screen readers. */
  srOnlyHeader?: boolean;
  render: (row: Row, index: number) => ReactNode;
};

export function DataTable<Row>({
  columns,
  rows,
  rowKey,
  emptyLabel = "No records to display.",
  caption,
  stickyHeader = true
}: {
  columns: Column<Row>[];
  rows: Row[];
  rowKey: (row: Row, index: number) => string;
  emptyLabel?: string;
  caption?: string;
  /** Sticky thead defaults to true. Set false for short tables (< 6 rows). */
  stickyHeader?: boolean;
}) {
  if (rows.length === 0) {
    return (
      <div className="empty" role="status" aria-live="polite">
        <p>{emptyLabel}</p>
      </div>
    );
  }

  return (
    <table className={`table data-table${stickyHeader ? " data-table-sticky" : ""}`}>
      {caption ? <caption className="visually-hidden">{caption}</caption> : null}
      <thead>
        <tr>
          {columns.map((column) => {
            const align = column.align ?? (column.numeric ? "right" : "left");
            return (
              <th
                key={column.key}
                scope="col"
                style={{ textAlign: align, width: column.width }}
              >
                {column.srOnlyHeader ? (
                  <span className="visually-hidden">{column.header}</span>
                ) : (
                  column.header
                )}
              </th>
            );
          })}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, index) => (
          <tr key={rowKey(row, index)}>
            {columns.map((column) => {
              const align = column.align ?? (column.numeric ? "right" : "left");
              const className = column.numeric ? "td-numeric" : undefined;
              return (
                <td
                  key={column.key}
                  className={className}
                  style={{ textAlign: align }}
                >
                  {column.render(row, index)}
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
