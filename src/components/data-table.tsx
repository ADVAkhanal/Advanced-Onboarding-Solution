import type { ReactNode } from "react";

export type Column<Row> = {
  key: string;
  header: string;
  align?: "left" | "center" | "right";
  width?: string;
  render: (row: Row, index: number) => ReactNode;
};

export function DataTable<Row>({
  columns,
  rows,
  rowKey,
  emptyLabel = "No records to display.",
  caption
}: {
  columns: Column<Row>[];
  rows: Row[];
  rowKey: (row: Row, index: number) => string;
  emptyLabel?: string;
  caption?: string;
}) {
  if (rows.length === 0) {
    return (
      <div className="empty">
        <p>{emptyLabel}</p>
      </div>
    );
  }

  return (
    <table className="table data-table">
      {caption ? <caption className="visually-hidden">{caption}</caption> : null}
      <thead>
        <tr>
          {columns.map((column) => (
            <th
              key={column.key}
              style={{ textAlign: column.align ?? "left", width: column.width }}
            >
              {column.header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, index) => (
          <tr key={rowKey(row, index)}>
            {columns.map((column) => (
              <td key={column.key} style={{ textAlign: column.align ?? "left" }}>
                {column.render(row, index)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
